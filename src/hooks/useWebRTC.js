import { useCallback, useEffect, useRef } from 'react';
import { socket } from 'socket';
import { JOIN } from 'socket/actions';
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
  }, [roomID]);

  const provideMediaRef = useCallback((id, node) => {
    peerMediaElements.current[id] = node;
  }, []);

  return { clients, provideMediaRef };
};
