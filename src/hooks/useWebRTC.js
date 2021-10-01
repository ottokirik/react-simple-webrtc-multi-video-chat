import { useCallback, useEffect, useRef } from 'react';
import { socket } from 'socket';
import freeice from 'freeice';
import {
  ADD_PEER,
  ICE_CANDIDATE,
  JOIN,
  LEAVE,
  RELAY_ICE,
  RELAY_SDP,
  REMOVE_PEER,
  SESSION_DESCRIPTION,
} from 'socket/actions';
import { useStateWithCallback } from './useStateWithCallback';

export const LOCAL_VIDEO = 'LOCAL_VIDEO';

export const useWebRTC = ({ roomID }) => {
  const [clients, setClients] = useStateWithCallback([]);

  const addNewClient = useCallback(
    (newClient, cb) => {
      if (!clients.includes(newClient)) {
        setClients((list) => [...list, newClient], cb);
      }
    },
    [clients, setClients]
  );

  const peerConnections = useRef({});
  const localMediaStream = useRef(null);
  const peerMediaElements = useRef({
    [LOCAL_VIDEO]: null,
  });

  // Удалить PEER
  useEffect(() => {
    socket.on(REMOVE_PEER, ({ peerID }) => {
      if (peerID in peerConnections.current) {
        peerConnections.current[peerID].close();
      }

      delete peerConnections.current[peerID];
      delete peerMediaElements.current[peerID];

      setClients((list) => list.filter((c) => c !== peerID));
    });
  }, []);

  // Принять ICE CANDIDATE
  useEffect(() => {
    socket.on(ICE_CANDIDATE, ({ peerID, iceCandidate }) => {
      peerConnections.current[peerID].addIceCandidate(new RTCIceCandidate(iceCandidate));
    });
  }, []);

  // Принять SDP
  useEffect(() => {
    const setRemoteMedia = async ({ peerID, sessionDescription: remoteDescription }) => {
      await peerConnections.current[peerID].setRemoteDescription(new RTCSessionDescription(remoteDescription));

      if (remoteDescription.type === 'offer') {
        const answer = await peerConnections.current[peerID].createAnswer();

        await peerConnections.current[peerID].setLocalDescription(answer);

        socket.emit(RELAY_SDP, {
          peerID,
          sessionDescription: answer,
        });
      }
    };

    socket.on(SESSION_DESCRIPTION, setRemoteMedia);
  }, []);

  useEffect(() => {
    const handleAddNewPeer = async ({ peerID, createOffer }) => {
      if (peerID in peerConnections.current) {
        return console.warn(`Alraedy connected to peer ${peerID}`);
      }

      // Создаем подключение
      peerConnections.current[peerID] = new RTCPeerConnection({
        iceServers: freeice(), // Бесплатные stun сервера, stun-сервер возращает реальный ip и port устройства, необходим для работы через NAT
      });

      peerConnections.current[peerID].onicecandidate = (event) => {
        // Кандидат на подключение
        if (event.candidate) {
          socket.emit(RELAY_ICE, {
            peerID,
            iceCandidate: event.candidate,
          });
        }
      };

      // Извлекаем стримы
      let tracksNumber = 0; // Приходят два трека, аудио и видео, добавляем клиента только, если пришли оба трека
      peerConnections.current[peerID].ontrack = ({ streams: [remoteStream] }) => {
        tracksNumber += 1;

        if (tracksNumber === 2) {
          tracksNumber = 0;
          addNewClient(peerID, () => {
            // Video элемент создается для данного peerID в provideMediaRef на страничке комнаты
            peerMediaElements.current[peerID].srcObject = remoteStream;
          });
        }
      };

      localMediaStream.current.getTracks().forEach((track) => {
        peerConnections.current[peerID].addTrack(track, localMediaStream.current);
      });

      if (createOffer) {
        const offer = await peerConnections.current[peerID].createOffer();

        await peerConnections.current[peerID].setLocalDescription(offer); // После этого сработает onicecandidate

        socket.emit(RELAY_SDP, {
          // Отправка всего подготовленного выше
          peerID,
          sessionDescription: offer,
        });
      }
    };

    socket.on(ADD_PEER, handleAddNewPeer);
  }, []);

  useEffect(() => {
    const startCapture = async () => {
      localMediaStream.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: {
          width: 1280,
          height: 720,
        },
      });

      addNewClient(LOCAL_VIDEO, () => {
        const localVideoElement = peerMediaElements.current[LOCAL_VIDEO];

        if (localVideoElement) {
          localVideoElement.volume = 0;
          localVideoElement.srcObject = localMediaStream.current;
        }
      });
    };

    startCapture()
      .then(() => socket.emit(JOIN, { room: roomID }))
      .catch((e) => console.log('Error getting user media', e));

    return () => {
      localMediaStream.current?.getTracks().forEach((track) => {
        track.stop();
      });

      socket.emit(LEAVE);
    };
  }, [roomID]);

  const provideMediaRef = useCallback((id, node) => {
    peerMediaElements.current[id] = node;
  }, []);

  return { clients, provideMediaRef };
};
