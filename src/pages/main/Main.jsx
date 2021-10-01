import { useEffect, useRef, useState } from 'react';
import { useHistory } from 'react-router';
import { socket } from 'socket';
import { SHARE_ROOMS } from 'socket/actions';
import { v4 } from 'uuid';

export const Main = () => {
  const [rooms, updateRooms] = useState([]);
  const history = useHistory();
  const rootNode = useRef();

  useEffect(() => {
    socket.on(SHARE_ROOMS, ({ rooms = [] } = {}) => {
      if (rootNode.current) {
        updateRooms(rooms);
      }
    });
  }, []);

  return (
    <div ref={rootNode}>
      <h1>Available Rooms:</h1>

      <ul>
        {rooms.map((roomID) => {
          return (
            <li key={roomID}>
              {roomID}
              <button onClick={() => history.push(`/room/${roomID}`)}>Join room</button>
            </li>
          );
        })}
      </ul>

      <button onClick={() => history.push(`/room/${v4()}`)}>Create new room</button>
    </div>
  );
};
