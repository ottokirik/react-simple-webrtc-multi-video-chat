const path = require('path');
const express = require('express');

const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

const PORT = process.env.PORT || 3001;
const {
  ADD_PEER,
  JOIN,
  SHARE_ROOMS,
  LEAVE,
  REMOVE_PEER,
  RELAY_SDP,
  SESSION_DESCRIPTION,
  RELAY_ICE,
  ICE_CANDIDATE,
} = require('./src/socket/actions');
const { validate, version } = require('uuid');

const getClientRooms = () => {
  const { rooms } = io.sockets.adapter;

  return Array.from(rooms.keys()).filter((roomID) => validate(roomID) && version(roomID) === 4); // Фильтрация, только валидные uuid v4 айдишки
};

const shareRoomsInfo = () => {
  io.emit(SHARE_ROOMS, { rooms: getClientRooms() });
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

  const leaveRoom = () => {
    const { rooms } = socket;

    Array.from(rooms).forEach((roomID) => {
      const clients = Array.from(io.sockets.adapter.rooms.get(roomID) || []);

      clients.forEach((clientID) => {
        io.to(clientID).emit(REMOVE_PEER, {
          peerID: socket.id,
        });

        socket.emit(REMOVE_PEER, {
          peerID: clientID,
        });
      });

      socket.leave(roomID);
    });

    shareRoomsInfo();
  };

  socket.on(RELAY_SDP, ({ peerID, sessionDescription }) => {
    io.to(peerID).emit(SESSION_DESCRIPTION, {
      peerID: socket.id,
      sessionDescription,
    });
  });

  socket.on(RELAY_ICE, ({ peerID, iceCandidate }) => {
    io.to(peerID).emit(ICE_CANDIDATE, {
      peerID: socket.id,
      iceCandidate,
    });
  });

  socket.on(LEAVE, leaveRoom);
  socket.on('disconnect', leaveRoom);
});

httpServer.listen(PORT, () => {
  console.log(`Server run on port: ${PORT}`);
});
