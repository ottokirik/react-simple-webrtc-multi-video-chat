import { LOCAL_VIDEO, useWebRTC } from 'hooks/useWebRTC';
import { useParams } from 'react-router';

export const Room = () => {
  const { id: roomID } = useParams();
  const { clients, provideMediaRef } = useWebRTC({ roomID });

  return (
    <div>
      {clients.map((clientID) => (
        <div key={clientID}>
          <video
            ref={(instance) => provideMediaRef(clientID, instance)}
            autoPlay
            playsInline
            muted={clientID === LOCAL_VIDEO}
          />
        </div>
      ))}
    </div>
  );
};
