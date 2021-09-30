import { useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import { socket } from 'socket';
import { SHARE_ROOMS } from 'socket/actions';
import { v4 } from 'uuid';

export const Main = () => {
  const [rooms, updateRooms] = useState([]);
  const history = useHistory();

  useEffect(() => {
    socket.on(SHARE_ROOMS, ({ rooms = [] } = {}) => {
      updateRooms(rooms);
    });
  }, []);

  return (
    <div>
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
