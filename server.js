const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Configuración para servir archivos estáticos
app.use(express.static(path.join(__dirname, "public")));

// Almacenamiento de partidas
const games = {};

io.on("connection", (socket) => {
  console.log("Nuevo cliente conectado:", socket.id);

  socket.on("createGame", () => {
    const gameId = generateGameId();
    games[gameId] = {
      players: [socket.id],
      board: initializeBoard(),
      currentPlayer: "white",
      capturedPieces: { white: [], black: [] },
      enPassantTarget: null,
      castlingRights: {
        white: { kingside: true, queenside: true },
        black: { kingside: true, queenside: true },
      },
    };

    socket.join(gameId);
    socket.emit("gameCreated", gameId, "white");
    console.log(`Partida creada: ${gameId}`);
  });

  socket.on("joinGame", (gameId) => {
    if (games[gameId] && games[gameId].players.length === 1) {
      games[gameId].players.push(socket.id);
      socket.join(gameId);
      socket.emit("gameJoined", gameId, "black");
      io.to(gameId).emit("playerJoined", games[gameId]);
    } else {
      socket.emit("gameError", "Partida no encontrada o llena");
    }
  });

  socket.on("makeMove", (gameId, from, to) => {
    const game = games[gameId];
    if (!game) return;

    // Validar que es el turno del jugador
    const playerColor = game.players[0] === socket.id ? "white" : "black";
    if (playerColor !== game.currentPlayer) return;

    // Aquí implementarías la lógica de validación de movimientos
    // Similar a tu código actual pero en el servidor

    // Actualizar estado del juego
    game.currentPlayer = game.currentPlayer === "white" ? "black" : "white";

    // Notificar a ambos jugadores
    io.to(gameId).emit("moveMade", from, to, game.currentPlayer);
  });

  socket.on("disconnect", () => {
    console.log("Cliente desconectado:", socket.id);
    // Limpiar partidas abandonadas
  });
});

function initializeBoard() {
  return [
    [
      { piece: "rook", color: "black" },
      { piece: "knight", color: "black" },
      { piece: "bishop", color: "black" },
      { piece: "queen", color: "black" },
      { piece: "king", color: "black" },
      { piece: "bishop", color: "black" },
      { piece: "knight", color: "black" },
      { piece: "rook", color: "black" },
    ],
    Array(8)
      .fill(null)
      .map(() => ({ piece: "pawn", color: "black" })),
    Array(8).fill(null),
    Array(8).fill(null),
    Array(8).fill(null),
    Array(8).fill(null),
    Array(8)
      .fill(null)
      .map(() => ({ piece: "pawn", color: "white" })),
    [
      { piece: "rook", color: "white" },
      { piece: "knight", color: "white" },
      { piece: "bishop", color: "white" },
      { piece: "queen", color: "white" },
      { piece: "king", color: "white" },
      { piece: "bishop", color: "white" },
      { piece: "knight", color: "white" },
      { piece: "rook", color: "white" },
    ],
  ];
}

function generateGameId() {
  return Math.random().toString(36).substr(2, 5).toUpperCase();
}

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
  console.log(
    `Accesible en tu red local en: http://${getLocalIpAddress()}:${PORT}`
  );
});

function getLocalIpAddress() {
  const interfaces = require("os").networkInterfaces();
  for (const devName in interfaces) {
    const iface = interfaces[devName];
    for (let i = 0; i < iface.length; i++) {
      const alias = iface[i];
      if (
        alias.family === "IPv4" &&
        alias.address !== "127.0.0.1" &&
        !alias.internal
      ) {
        return alias.address;
      }
    }
  }
  return "localhost";
}
