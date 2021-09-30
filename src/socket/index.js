import { io } from 'socket.io-client';

const socketURL = 'http://localhost:3001';

const options = {
  forceNew: true,
  reconnectionAttempts: 'Infinity',
  timeout: 10000,
  transports: ['websocket'],
};

export const socket = io(socketURL, options);
