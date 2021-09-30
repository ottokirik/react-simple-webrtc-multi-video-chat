const path = require('path');
const express = require('express');

const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

const PORT = process.env.PORT || 3001;
const ACTIONS = require('./src/socket/actions');

const getClientRooms = () => {
  const { rooms } = io.sockets.adapter;

  return Array.from(rooms.keys());
};

const shareRoomsInfo = () => {
  io.emit(ACTIONS.SHARE_ROOM, { rooms: getClientRooms });
};

io.on('connect', (socket) => {
  shareRoomsInfo();
});

httpServer.listen(PORT, () => {
  console.log(`Server run on port: ${PORT}`);
});
