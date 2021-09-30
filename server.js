const path = require('path');
const express = require('express');

const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

const PORT = process.env.PORT || 3001;
const { ADD_PEER, JOIN, SHARE_ROOMS } = require('./src/socket/actions');

const getClientRooms = () => {
  const { rooms } = io.sockets.adapter;

  return Array.from(rooms.keys());
};

const shareRoomsInfo = () => {
  io.emit(SHARE_ROOMS, { rooms: getClientRooms });
};

io.on('connect', (socket) => {
  shareRoomsInfo();

  socket.on(JOIN, (config) => {
    const { room: roomID } = config;
    const { rooms: joinedRooms } = socket;

    // Проверяем, что подключаещегося сокета нет в комнате
    if (Array.from(joinedRooms).includes(roomID)) {
      return console.warn(`Already joined to ${roomID}`);
    }

    // Все подключенные сокеты в комнате
    const clients = Array.from(io.sockets.adapter.rooms.get(roomID) || []);

    // Отсылаем каждому клиенту id вновь подключившегося
    clients.forEach((clientID) => {
      io.to(clientID).emit(ADD_PEER, {
        peerID: socket.id,
        createOffer: false,
      });

      // Подключившемуся клиенту отсылаем id уже существующих клиентов
      socket.emit(ADD_PEER, {
        peerID: clientID,
        createOffer: true, // Офер на подключение по WebRTC будет создавать вновь подлючившийся
      });
    });

    socket.join(roomID);

    shareRoomsInfo();
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server run on port: ${PORT}`);
});
