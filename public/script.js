const socket = io();
let gameId = null;
let playerColor = null;

// Definición de piezas (debe estar al inicio del archivo)
const pieces = {
  white: {
    king: "♔",
    queen: "♕",
    rook: "♖",
    bishop: "♗",
    knight: "♘",
    pawn: "♙",
  },
  black: {
    king: "♚",
    queen: "♛",
    rook: "♜",
    bishop: "♝",
    knight: "♞",
    pawn: "♟",
  },
};

let board = [];
let currentPlayer = "white";
let selectedSquare = null;
let gameHistory = [];
let capturedPieces = { white: [], black: [] };
let enPassantTarget = null;
let castlingRights = {
  white: { kingside: true, queenside: true },
  black: { kingside: true, queenside: true },
};
let pendingPromotion = null;

// Elementos del DOM
const connectionPanel = document.getElementById("connectionPanel");
const gamePanel = document.getElementById("gamePanel");
const createGameBtn = document.getElementById("createGameBtn");
const joinGameBtn = document.getElementById("joinGameBtn");
const gameIdInput = document.getElementById("gameIdInput");
const connectionStatus = document.getElementById("connectionStatus");
const gameIdDisplay = document.getElementById("gameIdDisplay");

// Event listeners
createGameBtn.addEventListener("click", () => {
  socket.emit("createGame");
  connectionStatus.textContent = "Creando partida...";
});

joinGameBtn.addEventListener("click", () => {
  const gameId = gameIdInput.value.trim();
  if (gameId) {
    socket.emit("joinGame", gameId);
    connectionStatus.textContent = `Uniéndose a partida ${gameId}...`;
  }
});

// Eventos de Socket.io
socket.on("gameCreated", (id, color) => {
  gameId = id;
  playerColor = color;
  connectionPanel.style.display = "none";
  gamePanel.style.display = "block";
  gameIdDisplay.textContent = `ID de Partida: ${gameId}`;
  connectionStatus.textContent = `Partida creada. Comparte el ID: ${gameId}`;
  initializeBoard();
  renderBoard();
});

socket.on("gameJoined", (id, color) => {
  gameId = id;
  playerColor = color;
  connectionPanel.style.display = "none";
  gamePanel.style.display = "block";
  gameIdDisplay.textContent = `ID de Partida: ${gameId}`;
  connectionStatus.textContent = `Unido a partida como ${
    color === "white" ? "Blancas" : "Negras"
  }`;
  initializeBoard();
  renderBoard();
});

socket.on("playerJoined", (gameState) => {
  connectionStatus.textContent =
    "¡Oponente conectado! La partida puede comenzar.";
  // Sincronizar estado del juego
  board = gameState.board;
  currentPlayer = gameState.currentPlayer;
  capturedPieces = gameState.capturedPieces;
  enPassantTarget = gameState.enPassantTarget;
  castlingRights = gameState.castlingRights;
  renderBoard();
});

socket.on("moveMade", (from, to, nextPlayer) => {
  // Actualizar tablero con el movimiento del oponente
  const [fromRow, fromCol] = from;
  const [toRow, toCol] = to;

  const piece = board[fromRow][fromCol];
  board[toRow][toCol] = piece;
  board[fromRow][fromCol] = null;

  currentPlayer = nextPlayer;
  renderBoard();
});

socket.on("gameError", (message) => {
  connectionStatus.textContent = message;
});

// El resto de tus funciones (initializeBoard, renderBoard, handleSquareClick, etc.)

function initializeBoard() {
  board = [
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

// Renderizar tablero
function renderBoard() {
  const boardElement = document.getElementById("chessBoard");
  boardElement.innerHTML = "";

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const square = document.createElement("div");
      square.className = `square ${(row + col) % 2 === 0 ? "light" : "dark"}`;
      square.dataset.row = row;
      square.dataset.col = col;
      square.onclick = () => handleSquareClick(row, col);

      const piece = board[row][col];
      if (piece) {
        square.textContent = pieces[piece.color][piece.piece];
      }

      boardElement.appendChild(square);
    }
  }

  updateGameStatus();
}

// se mantienen similares pero ahora deben enviar los movimientos al servidor:

function handleSquareClick(row, col) {
  if (playerColor !== currentPlayer) return;
  if (pendingPromotion) return;

  const square = document.querySelector(
    `[data-row="${row}"][data-col="${col}"]`
  );

  if (selectedSquare) {
    const [selectedRow, selectedCol] = selectedSquare;

    if (row === selectedRow && col === selectedCol) {
      clearSelection();
      return;
    }

    if (isValidMove(selectedRow, selectedCol, row, col)) {
      // Enviar movimiento al servidor
      socket.emit("makeMove", gameId, [selectedRow, selectedCol], [row, col]);
      clearSelection();
      return;
    }
  }

  // Seleccionar pieza
  const piece = board[row][col];
  if (piece && piece.color === playerColor) {
    clearSelection();
    selectedSquare = [row, col];
    square.classList.add("selected");
    highlightPossibleMoves(row, col);
  }
}

// Las demás funciones de tu juego original pueden permanecer iguales
// solo asegúrate de que cuando se realice un movimiento, se envíe al servidor

// Limpiar selección
function clearSelection() {
  document.querySelectorAll(".square").forEach((sq) => {
    sq.classList.remove("selected", "possible-move", "last-move");
  });
  selectedSquare = null;
}

// Resaltar movimientos posibles
function highlightPossibleMoves(row, col) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (isValidMove(row, col, r, c)) {
        const square = document.querySelector(
          `[data-row="${r}"][data-col="${c}"]`
        );
        square.classList.add("possible-move");
      }
    }
  }
}

// Validar movimiento
function isValidMove(fromRow, fromCol, toRow, toCol) {
  const piece = board[fromRow][fromCol];
  if (!piece || piece.color !== currentPlayer) return false;

  const targetPiece = board[toRow][toCol];
  if (targetPiece && targetPiece.color === piece.color) return false;

  // Verificar si el movimiento es válido según la pieza
  if (!isPieceMovementValid(piece, fromRow, fromCol, toRow, toCol))
    return false;

  // Verificar si el movimiento deja al rey en jaque
  if (wouldLeaveKingInCheck(fromRow, fromCol, toRow, toCol)) return false;

  return true;
}

// Validar movimiento específico de cada pieza
function isPieceMovementValid(piece, fromRow, fromCol, toRow, toCol) {
  const deltaRow = toRow - fromRow;
  const deltaCol = toCol - fromCol;
  const absDeltaRow = Math.abs(deltaRow);
  const absDeltaCol = Math.abs(deltaCol);

  switch (piece.piece) {
    case "pawn":
      return isValidPawnMove(piece.color, fromRow, fromCol, toRow, toCol);
    case "rook":
      return (
        (deltaRow === 0 || deltaCol === 0) &&
        isPathClear(fromRow, fromCol, toRow, toCol)
      );
    case "bishop":
      return (
        absDeltaRow === absDeltaCol &&
        isPathClear(fromRow, fromCol, toRow, toCol)
      );
    case "queen":
      return (
        (deltaRow === 0 || deltaCol === 0 || absDeltaRow === absDeltaCol) &&
        isPathClear(fromRow, fromCol, toRow, toCol)
      );
    case "knight":
      return (
        (absDeltaRow === 2 && absDeltaCol === 1) ||
        (absDeltaRow === 1 && absDeltaCol === 2)
      );
    case "king":
      return isValidKingMove(piece.color, fromRow, fromCol, toRow, toCol);
    default:
      return false;
  }
}

// Validar movimiento de peón
function isValidPawnMove(color, fromRow, fromCol, toRow, toCol) {
  const direction = color === "white" ? -1 : 1;
  const deltaRow = toRow - fromRow;
  const deltaCol = toCol - fromCol;
  const startRow = color === "white" ? 6 : 1;

  // Movimiento hacia adelante
  if (deltaCol === 0) {
    if (deltaRow === direction && !board[toRow][toCol]) return true;
    if (
      fromRow === startRow &&
      deltaRow === 2 * direction &&
      !board[toRow][toCol] &&
      !board[fromRow + direction][fromCol]
    )
      return true;
  }
  // Captura diagonal
  else if (Math.abs(deltaCol) === 1 && deltaRow === direction) {
    if (board[toRow][toCol] && board[toRow][toCol].color !== color) return true;
    // Captura al paso
    if (
      enPassantTarget &&
      toRow === enPassantTarget.row &&
      toCol === enPassantTarget.col
    )
      return true;
  }

  return false;
}

// Validar movimiento de rey
function isValidKingMove(color, fromRow, fromCol, toRow, toCol) {
  const deltaRow = Math.abs(toRow - fromRow);
  const deltaCol = Math.abs(toCol - fromCol);

  // Movimiento normal del rey
  if (deltaRow <= 1 && deltaCol <= 1) return true;

  // Enroque
  if (deltaRow === 0 && deltaCol === 2) {
    return canCastle(color, fromRow, fromCol, toRow, toCol);
  }

  return false;
}

// Verificar si se puede hacer enroque
function canCastle(color, fromRow, fromCol, toRow, toCol) {
  // Verificar si el rey y la torre no se han movido
  const kingSide = toCol > fromCol;
  const rights = castlingRights[color];

  if (kingSide && !rights.kingside) return false;
  if (!kingSide && !rights.queenside) return false;

  // Verificar que las casillas entre el rey y la torre estén vacías
  const rookCol = kingSide ? 7 : 0;
  const start = Math.min(fromCol, rookCol) + 1;
  const end = Math.max(fromCol, rookCol);

  for (let col = start; col < end; col++) {
    if (board[fromRow][col]) return false;
  }

  // Verificar que el rey no esté en jaque y no pase por jaque
  if (isKingInCheck(color)) return false;

  const step = kingSide ? 1 : -1;
  for (let col = fromCol; col !== toCol + step; col += step) {
    if (wouldBeInCheck(color, fromRow, col)) return false;
  }

  return true;
}

// Verificar si el camino está libre
function isPathClear(fromRow, fromCol, toRow, toCol) {
  const deltaRow = toRow - fromRow;
  const deltaCol = toCol - fromCol;
  const stepRow = deltaRow === 0 ? 0 : deltaRow / Math.abs(deltaRow);
  const stepCol = deltaCol === 0 ? 0 : deltaCol / Math.abs(deltaCol);

  let currentRow = fromRow + stepRow;
  let currentCol = fromCol + stepCol;

  while (currentRow !== toRow || currentCol !== toCol) {
    if (board[currentRow][currentCol]) return false;
    currentRow += stepRow;
    currentCol += stepCol;
  }

  return true;
}

// Realizar movimiento
function makeMove(fromRow, fromCol, toRow, toCol) {
  const piece = board[fromRow][fromCol];
  const capturedPiece = board[toRow][toCol];

  // Guardar estado para deshacer
  gameHistory.push({
    board: board.map((row) => [...row]),
    currentPlayer,
    enPassantTarget,
    castlingRights: JSON.parse(JSON.stringify(castlingRights)),
    capturedPieces: JSON.parse(JSON.stringify(capturedPieces)),
  });

  // Manejar captura al paso
  if (
    piece.piece === "pawn" &&
    enPassantTarget &&
    toRow === enPassantTarget.row &&
    toCol === enPassantTarget.col
  ) {
    const capturedPawnRow = currentPlayer === "white" ? toRow + 1 : toRow - 1;
    const capturedPawn = board[capturedPawnRow][toCol];
    capturedPieces[capturedPawn.color].push(capturedPawn);
    board[capturedPawnRow][toCol] = null;
  }

  // Manejar captura normal
  if (capturedPiece) {
    capturedPieces[capturedPiece.color].push(capturedPiece);
  }

  // Realizar el movimiento
  board[toRow][toCol] = piece;
  board[fromRow][fromCol] = null;

  // Manejar enroque
  if (piece.piece === "king" && Math.abs(toCol - fromCol) === 2) {
    const kingSide = toCol > fromCol;
    const rookFromCol = kingSide ? 7 : 0;
    const rookToCol = kingSide ? 5 : 3;

    board[toRow][rookToCol] = board[fromRow][rookFromCol];
    board[fromRow][rookFromCol] = null;
  }

  // Actualizar derechos de enroque
  if (piece.piece === "king") {
    castlingRights[piece.color].kingside = false;
    castlingRights[piece.color].queenside = false;
  } else if (piece.piece === "rook") {
    if (fromCol === 0) castlingRights[piece.color].queenside = false;
    if (fromCol === 7) castlingRights[piece.color].kingside = false;
  }

  // Manejar captura al paso (establecer objetivo)
  enPassantTarget = null;
  if (piece.piece === "pawn" && Math.abs(toRow - fromRow) === 2) {
    enPassantTarget = {
      row: (fromRow + toRow) / 2,
      col: toCol,
    };
  }

  // Verificar promoción de peón
  if (piece.piece === "pawn" && (toRow === 0 || toRow === 7)) {
    pendingPromotion = { row: toRow, col: toCol };
    document.getElementById("promotionModal").style.display = "flex";
    return;
  }

  // Cambiar turno
  currentPlayer = currentPlayer === "white" ? "black" : "white";
  renderBoard();
}

// Funciones de promoción
function promoteToQueen() {
  promotePawn("queen");
}

function promoteToRook() {
  promotePawn("rook");
}

function promoteToBishop() {
  promotePawn("bishop");
}

function promoteToKnight() {
  promotePawn("knight");
}

function promotePawn(pieceType) {
  if (pendingPromotion) {
    const { row, col } = pendingPromotion;
    board[row][col].piece = pieceType;
    pendingPromotion = null;
    document.getElementById("promotionModal").style.display = "none";

    currentPlayer = currentPlayer === "white" ? "black" : "white";
    renderBoard();
  }
}

// Verificar si el rey está en jaque
function isKingInCheck(color) {
  const king = findKing(color);
  if (!king) return false;

  return wouldBeInCheck(color, king.row, king.col);
}

// Encontrar rey
function findKing(color) {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece && piece.piece === "king" && piece.color === color) {
        return { row, col };
      }
    }
  }
  return null;
}

// Verificar si una posición estaría en jaque
function wouldBeInCheck(color, row, col) {
  const opponentColor = color === "white" ? "black" : "white";

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && piece.color === opponentColor) {
        if (isPieceMovementValid(piece, r, c, row, col)) {
          return true;
        }
      }
    }
  }
  return false;
}

// Verificar si un movimiento dejaría al rey en jaque
function wouldLeaveKingInCheck(fromRow, fromCol, toRow, toCol) {
  const piece = board[fromRow][fromCol];
  const capturedPiece = board[toRow][toCol];

  // Simular movimiento
  board[toRow][toCol] = piece;
  board[fromRow][fromCol] = null;

  const kingInCheck = isKingInCheck(piece.color);

  // Revertir movimiento
  board[fromRow][fromCol] = piece;
  board[toRow][toCol] = capturedPiece;

  return kingInCheck;
}

// Verificar jaque mate
function isCheckmate(color) {
  if (!isKingInCheck(color)) return false;

  for (let fromRow = 0; fromRow < 8; fromRow++) {
    for (let fromCol = 0; fromCol < 8; fromCol++) {
      const piece = board[fromRow][fromCol];
      if (piece && piece.color === color) {
        for (let toRow = 0; toRow < 8; toRow++) {
          for (let toCol = 0; toCol < 8; toCol++) {
            if (isValidMove(fromRow, fromCol, toRow, toCol)) {
              return false;
            }
          }
        }
      }
    }
  }
  return true;
}

// Verificar ahogado
function isStalemate(color) {
  if (isKingInCheck(color)) return false;

  for (let fromRow = 0; fromRow < 8; fromRow++) {
    for (let fromCol = 0; fromCol < 8; fromCol++) {
      const piece = board[fromRow][fromCol];
      if (piece && piece.color === color) {
        for (let toRow = 0; toRow < 8; toRow++) {
          for (let toCol = 0; toCol < 8; toCol++) {
            if (isValidMove(fromRow, fromCol, toRow, toCol)) {
              return false;
            }
          }
        }
      }
    }
  }
  return true;
}

// Actualizar estado del juego
function updateGameStatus() {
  const turnIndicator = document.getElementById("turnIndicator");
  const statusMessage = document.getElementById("statusMessage");
  const capturedWhite = document.getElementById("capturedWhite");
  const capturedBlack = document.getElementById("capturedBlack");

  // Actualizar indicador de turno
  turnIndicator.textContent =
    currentPlayer === "white" ? "Turno: Blancas" : "Turno: Negras";
  turnIndicator.className = `turn-indicator ${currentPlayer}-turn`;

  // Actualizar piezas capturadas
  capturedWhite.textContent = capturedPieces.white
    .map((p) => pieces[p.color][p.piece])
    .join(" ");
  capturedBlack.textContent = capturedPieces.black
    .map((p) => pieces[p.color][p.piece])
    .join(" ");

  // Verificar estado del juego
  if (isCheckmate(currentPlayer)) {
    const winner = currentPlayer === "white" ? "Negras" : "Blancas";
    statusMessage.textContent = `¡Jaque Mate! Ganan las ${winner}`;
    statusMessage.className = "status checkmate-status";
  } else if (isStalemate(currentPlayer)) {
    statusMessage.textContent = "¡Ahogado! Empate";
    statusMessage.className = "status stalemate-status";
  } else if (isKingInCheck(currentPlayer)) {
    statusMessage.textContent = "¡Jaque!";
    statusMessage.className = "status check-status";

    // Resaltar rey en jaque
    const king = findKing(currentPlayer);
    if (king) {
      const kingSquare = document.querySelector(
        `[data-row="${king.row}"][data-col="${king.col}"]`
      );
      kingSquare.classList.add("check");
    }
  } else {
    statusMessage.textContent = "";
    statusMessage.className = "status";
  }
}

// Nueva partida
function newGame() {
  initializeBoard();
  currentPlayer = "white";
  selectedSquare = null;
  gameHistory = [];
  capturedPieces = { white: [], black: [] };
  enPassantTarget = null;
  castlingRights = {
    white: { kingside: true, queenside: true },
    black: { kingside: true, queenside: true },
  };
  pendingPromotion = null;
  document.getElementById("promotionModal").style.display = "none";
  renderBoard();
}

// Deshacer jugada
function undoMove() {
  if (gameHistory.length === 0) return;

  const lastState = gameHistory.pop();
  board = lastState.board;
  currentPlayer = lastState.currentPlayer;
  enPassantTarget = lastState.enPassantTarget;
  castlingRights = lastState.castlingRights;
  capturedPieces = lastState.capturedPieces;
  pendingPromotion = null;
  document.getElementById("promotionModal").style.display = "none";
  clearSelection();
  renderBoard();
}

// Inicializar juego
initializeBoard();
renderBoard();
