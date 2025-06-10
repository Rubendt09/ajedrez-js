document.addEventListener("DOMContentLoaded", () => {
  // Configuración inicial del juego
  const board = document.getElementById("chessboard");
  const turnIndicator = document.getElementById("turn-indicator");
  const gameStatus = document.getElementById("game-status");
  const resetBtn = document.getElementById("reset-btn");

  let selectedPiece = null;
  let currentPlayer = "white";
  let gameState = "playing"; // 'playing', 'check', 'checkmate', 'stalemate'
  let boardState = createInitialBoard();

  // Inicializar el tablero
  renderBoard();

  // Event listeners
  resetBtn.addEventListener("click", resetGame);

  // Funciones del juego
  function createInitialBoard() {
    // Representación del tablero (8x8)
    const board = Array(8)
      .fill()
      .map(() => Array(8).fill(null));

    // Colocar piezas blancas
    board[0][0] = { type: "rook", color: "white" };
    board[0][1] = { type: "knight", color: "white" };
    board[0][2] = { type: "bishop", color: "white" };
    board[0][3] = { type: "queen", color: "white" };
    board[0][4] = { type: "king", color: "white" };
    board[0][5] = { type: "bishop", color: "white" };
    board[0][6] = { type: "knight", color: "white" };
    board[0][7] = { type: "rook", color: "white" };
    for (let i = 0; i < 8; i++) {
      board[1][i] = { type: "pawn", color: "white" };
    }

    // Colocar piezas negras
    board[7][0] = { type: "rook", color: "black" };
    board[7][1] = { type: "knight", color: "black" };
    board[7][2] = { type: "bishop", color: "black" };
    board[7][3] = { type: "queen", color: "black" };
    board[7][4] = { type: "king", color: "black" };
    board[7][5] = { type: "bishop", color: "black" };
    board[7][6] = { type: "knight", color: "black" };
    board[7][7] = { type: "rook", color: "black" };
    for (let i = 0; i < 8; i++) {
      board[6][i] = { type: "pawn", color: "black" };
    }

    return board;
  }

  function renderBoard() {
    board.innerHTML = "";

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const square = document.createElement("div");
        square.className = `square ${(row + col) % 2 === 0 ? "light" : "dark"}`;
        square.dataset.row = row;
        square.dataset.col = col;

        const piece = boardState[row][col];
        if (piece) {
          const pieceElement = document.createElement("div");
          pieceElement.className = "piece";
          pieceElement.textContent = getPieceSymbol(piece);
          pieceElement.style.color = piece.color === "white" ? "#fff" : "#000";
          square.appendChild(pieceElement);
        }

        square.addEventListener("click", () => handleSquareClick(row, col));
        board.appendChild(square);
      }
    }

    updateGameInfo();
  }

  function getPieceSymbol(piece) {
    const symbols = {
      king: { white: "♔", black: "♚" },
      queen: { white: "♕", black: "♛" },
      rook: { white: "♖", black: "♜" },
      bishop: { white: "♗", black: "♝" },
      knight: { white: "♘", black: "♞" },
      pawn: { white: "♙", black: "♟" },
    };
    return symbols[piece.type][piece.color];
  }

  function handleSquareClick(row, col) {
    const piece = boardState[row][col];

    // Si no hay pieza seleccionada y se hace clic en una pieza del jugador actual
    if (!selectedPiece && piece && piece.color === currentPlayer) {
      selectedPiece = { row, col, piece };
      highlightValidMoves(row, col);
      return;
    }

    // Si hay una pieza seleccionada y se hace clic en un movimiento válido
    if (selectedPiece) {
      const validMoves = getValidMoves(selectedPiece.row, selectedPiece.col);
      const moveIsValid = validMoves.some(
        (move) => move.row === row && move.col === col
      );

      if (moveIsValid) {
        movePiece(selectedPiece.row, selectedPiece.col, row, col);
        currentPlayer = currentPlayer === "white" ? "black" : "white";
        checkGameState();
      }

      // Limpiar selección y resaltados
      selectedPiece = null;
      clearHighlights();
      renderBoard();
    }
  }

  function highlightValidMoves(row, col) {
    clearHighlights();
    const validMoves = getValidMoves(row, col);

    validMoves.forEach((move) => {
      const square = document.querySelector(
        `[data-row="${move.row}"][data-col="${move.col}"]`
      );
      if (square) {
        square.classList.add("highlight");
      }
    });
  }

  function clearHighlights() {
    document.querySelectorAll(".highlight").forEach((el) => {
      el.classList.remove("highlight");
    });
  }

  // ... (código anterior se mantiene igual hasta la función getValidMoves)

  function getValidMoves(row, col) {
    const piece = boardState[row][col];
    if (!piece) return [];

    const moves = [];
    const color = piece.color;
    const enemyColor = color === "white" ? "black" : "white";

    switch (piece.type) {
      case "pawn":
        const direction = color === "white" ? 1 : -1;
        const startRow = color === "white" ? 1 : 6;

        // Movimiento hacia adelante (1 casilla)
        if (
          isInBounds(row + direction, col) &&
          !boardState[row + direction][col]
        ) {
          moves.push({ row: row + direction, col });

          // Primer movimiento (2 casillas)
          if (row === startRow && !boardState[row + 2 * direction][col]) {
            moves.push({ row: row + 2 * direction, col });
          }
        }

        // Capturas diagonales
        for (const colOffset of [-1, 1]) {
          const newCol = col + colOffset;
          if (isInBounds(row + direction, newCol)) {
            const targetPiece = boardState[row + direction][newCol];
            if (targetPiece && targetPiece.color === enemyColor) {
              moves.push({ row: row + direction, col: newCol });
            }
            // TODO: Implementar captura al paso
          }
        }
        break;

      case "rook":
        // Movimientos horizontales y verticales
        for (const [dr, dc] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          let r = row + dr,
            c = col + dc;
          while (isInBounds(r, c)) {
            if (!boardState[r][c]) {
              moves.push({ row: r, col: c });
            } else {
              if (boardState[r][c].color === enemyColor) {
                moves.push({ row: r, col: c });
              }
              break;
            }
            r += dr;
            c += dc;
          }
        }
        break;

      case "knight":
        // Movimientos en L
        for (const [dr, dc] of [
          [2, 1],
          [2, -1],
          [-2, 1],
          [-2, -1],
          [1, 2],
          [1, -2],
          [-1, 2],
          [-1, -2],
        ]) {
          const r = row + dr;
          const c = col + dc;
          if (isInBounds(r, c)) {
            if (!boardState[r][c] || boardState[r][c].color === enemyColor) {
              moves.push({ row: r, col: c });
            }
          }
        }
        break;

      case "bishop":
        // Movimientos diagonales
        for (const [dr, dc] of [
          [1, 1],
          [1, -1],
          [-1, 1],
          [-1, -1],
        ]) {
          let r = row + dr,
            c = col + dc;
          while (isInBounds(r, c)) {
            if (!boardState[r][c]) {
              moves.push({ row: r, col: c });
            } else {
              if (boardState[r][c].color === enemyColor) {
                moves.push({ row: r, col: c });
              }
              break;
            }
            r += dr;
            c += dc;
          }
        }
        break;

      case "queen":
        // Combina movimientos de torre y alfil
        // Movimientos horizontales/verticales (como torre)
        for (const [dr, dc] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          let r = row + dr,
            c = col + dc;
          while (isInBounds(r, c)) {
            if (!boardState[r][c]) {
              moves.push({ row: r, col: c });
            } else {
              if (boardState[r][c].color === enemyColor) {
                moves.push({ row: r, col: c });
              }
              break;
            }
            r += dr;
            c += dc;
          }
        }
        // Movimientos diagonales (como alfil)
        for (const [dr, dc] of [
          [1, 1],
          [1, -1],
          [-1, 1],
          [-1, -1],
        ]) {
          let r = row + dr,
            c = col + dc;
          while (isInBounds(r, c)) {
            if (!boardState[r][c]) {
              moves.push({ row: r, col: c });
            } else {
              if (boardState[r][c].color === enemyColor) {
                moves.push({ row: r, col: c });
              }
              break;
            }
            r += dr;
            c += dc;
          }
        }
        break;

      case "king":
        // Movimientos de 1 casilla en todas direcciones
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue; // Saltar la posición actual

            const r = row + dr;
            const c = col + dc;
            if (isInBounds(r, c)) {
              if (!boardState[r][c] || boardState[r][c].color === enemyColor) {
                moves.push({ row: r, col: c });
              }
            }
          }
        }

        // TODO: Implementar enroque
        break;

      default:
        break;
    }

    return moves;
  }

  function isInBounds(row, col) {
    return row >= 0 && row < 8 && col >= 0 && col < 8;
  }

  // Variables globales adicionales necesarias
  let lastDoublePawnMove = null; // Para captura al paso
  let kingsAndRooksMoved = {
    white: { king: false, kingsideRook: false, queensideRook: false },
    black: { king: false, kingsideRook: false, queensideRook: false },
  };

  function movePiece(fromRow, fromCol, toRow, toCol) {
    boardState[toRow][toCol] = boardState[fromRow][fromCol];
    boardState[fromRow][fromCol] = null;

    // Implementar reglas especiales (enroque, coronación, etc.) aquí...
  }

  function checkGameState() {
    // Implementar verificación de jaque, jaque mate y tablas aquí...
    // Por ahora solo actualizamos el turno
    gameState = "playing";
  }

  function updateGameInfo() {
    turnIndicator.textContent = `Turno: ${
      currentPlayer === "white" ? "Blancas" : "Negras"
    }`;

    switch (gameState) {
      case "playing":
        gameStatus.textContent = "Estado: Juego en progreso";
        break;
      case "check":
        gameStatus.textContent = "Estado: Jaque";
        break;
      case "checkmate":
        gameStatus.textContent = `Estado: Jaque mate - Ganador: ${
          currentPlayer === "white" ? "Negras" : "Blancas"
        }`;
        break;
      case "stalemate":
        gameStatus.textContent = "Estado: Tablas";
        break;
    }
  }

  function resetGame() {
    boardState = createInitialBoard();
    currentPlayer = "white";
    gameState = "playing";
    selectedPiece = null;
    renderBoard();
  }
});
