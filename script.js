document.addEventListener("DOMContentLoaded", () => {
  // Configuración inicial del juego
  const board = document.getElementById("chessboard");
  const turnIndicator = document.getElementById("turn-indicator");
  const gameStatus = document.getElementById("game-status");
  const resetBtn = document.getElementById("reset-btn");
  const promotionModal = document.getElementById("promotion-modal");
  const promotionPieces = document.querySelectorAll(".promotion-piece");

  let selectedPiece = null;
  let currentPlayer = "white";
  let gameState = "playing"; // 'playing', 'check', 'checkmate', 'stalemate'
  let boardState = createInitialBoard();
  let lastMove = null;
  let castlingRights = {
    white: { kingside: true, queenside: true },
    black: { kingside: true, queenside: true },
  };
  let pendingPromotion = null;

  // Inicializar el tablero
  renderBoard();

  // Event listeners
  resetBtn.addEventListener("click", resetGame);
  promotionPieces.forEach((piece) => {
    piece.addEventListener("click", handlePromotionSelection);
  });

  // Funciones del juego
  function createInitialBoard() {
    // Representación del tablero (8x8)
    const board = Array(8)
      .fill()
      .map(() => Array(8).fill(null));

    // Colocar piezas blancas
    board[0][0] = { type: "rook", color: "white", hasMoved: false };
    board[0][1] = { type: "knight", color: "white", hasMoved: false };
    board[0][2] = { type: "bishop", color: "white", hasMoved: false };
    board[0][3] = { type: "queen", color: "white", hasMoved: false };
    board[0][4] = { type: "king", color: "white", hasMoved: false };
    board[0][5] = { type: "bishop", color: "white", hasMoved: false };
    board[0][6] = { type: "knight", color: "white", hasMoved: false };
    board[0][7] = { type: "rook", color: "white", hasMoved: false };
    for (let i = 0; i < 8; i++) {
      board[1][i] = { type: "pawn", color: "white", hasMoved: false };
    }

    // Colocar piezas negras
    board[7][0] = { type: "rook", color: "black", hasMoved: false };
    board[7][1] = { type: "knight", color: "black", hasMoved: false };
    board[7][2] = { type: "bishop", color: "black", hasMoved: false };
    board[7][3] = { type: "queen", color: "black", hasMoved: false };
    board[7][4] = { type: "king", color: "black", hasMoved: false };
    board[7][5] = { type: "bishop", color: "black", hasMoved: false };
    board[7][6] = { type: "knight", color: "black", hasMoved: false };
    board[7][7] = { type: "rook", color: "black", hasMoved: false };
    for (let i = 0; i < 8; i++) {
      board[6][i] = { type: "pawn", color: "black", hasMoved: false };
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

        // Resaltar el rey en jaque
        const piece = boardState[row][col];
        if (piece && piece.type === "king" && isKingInCheck(piece.color)) {
          square.classList.add("check");
        }

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
    // Si hay una promoción pendiente, no permitir otros movimientos
    if (pendingPromotion) return;

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
      const moveData = validMoves.find((m) => m.row === row && m.col === col);

      if (moveData) {
        // Verificar si el movimiento deja al rey en jaque
        const tempBoard = cloneBoard(boardState);
        makeTempMove(
          tempBoard,
          selectedPiece.row,
          selectedPiece.col,
          row,
          col,
          moveData.specialMove
        );

        if (!isKingInCheck(currentPlayer, tempBoard)) {
          // Manejar promoción de peón
          if (selectedPiece.piece.type === "pawn" && (row === 0 || row === 7)) {
            pendingPromotion = {
              fromRow: selectedPiece.row,
              fromCol: selectedPiece.col,
              toRow: row,
              toCol: col,
              specialMove: moveData.specialMove,
            };
            showPromotionModal(currentPlayer);
          } else {
            movePiece(
              selectedPiece.row,
              selectedPiece.col,
              row,
              col,
              moveData.specialMove
            );
            currentPlayer = currentPlayer === "white" ? "black" : "white";
            checkGameState();
          }
        }
      }

      // Limpiar selección y resaltados
      selectedPiece = null;
      clearHighlights();
      renderBoard();
    }
  }

  function handlePromotionSelection(e) {
    if (!pendingPromotion) return;

    const pieceType = e.target.dataset.piece;
    movePiece(
      pendingPromotion.fromRow,
      pendingPromotion.fromCol,
      pendingPromotion.toRow,
      pendingPromotion.toCol,
      pendingPromotion.specialMove,
      pieceType
    );

    hidePromotionModal();
    currentPlayer = currentPlayer === "white" ? "black" : "white";
    checkGameState();
    pendingPromotion = null;
    renderBoard();
  }

  function showPromotionModal(color) {
    promotionPieces.forEach((piece) => {
      piece.textContent = getPieceSymbol({ type: piece.dataset.piece, color });
      piece.style.color = color === "white" ? "#fff" : "#000";
    });
    promotionModal.style.display = "flex";
  }

  function hidePromotionModal() {
    promotionModal.style.display = "none";
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
    document.querySelectorAll(".check").forEach((el) => {
      el.classList.remove("check");
    });
  }

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
            // Captura al paso
            else if (
              !targetPiece &&
              lastMove &&
              lastMove.piece.type === "pawn" &&
              lastMove.piece.color === enemyColor &&
              Math.abs(lastMove.from.row - lastMove.to.row) === 2 &&
              lastMove.to.row === row &&
              lastMove.to.col === newCol
            ) {
              moves.push({
                row: row + direction,
                col: newCol,
                specialMove: "enPassant",
              });
            }
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
        for (const [dr, dc] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1], // Torre
          [1, 1],
          [1, -1],
          [-1, 1],
          [-1, -1], // Alfil
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
            if (dr === 0 && dc === 0) continue;

            const r = row + dr;
            const c = col + dc;
            if (isInBounds(r, c)) {
              if (!boardState[r][c] || boardState[r][c].color === enemyColor) {
                moves.push({ row: r, col: c });
              }
            }
          }
        }

        // Enroque
        if (!piece.hasMoved && !isKingInCheck(color)) {
          // Enroque corto (kingside)
          if (
            castlingRights[color].kingside &&
            !boardState[row][5] &&
            !boardState[row][6] &&
            boardState[row][7]?.type === "rook" &&
            !boardState[row][7].hasMoved &&
            !isSquareUnderAttack(row, 5, color) &&
            !isSquareUnderAttack(row, 6, color)
          ) {
            moves.push({
              row: row,
              col: 6,
              specialMove: "castleKingside",
            });
          }

          // Enroque largo (queenside)
          if (
            castlingRights[color].queenside &&
            !boardState[row][3] &&
            !boardState[row][2] &&
            !boardState[row][1] &&
            boardState[row][0]?.type === "rook" &&
            !boardState[row][0].hasMoved &&
            !isSquareUnderAttack(row, 3, color) &&
            !isSquareUnderAttack(row, 2, color)
          ) {
            moves.push({
              row: row,
              col: 2,
              specialMove: "castleQueenside",
            });
          }
        }
        break;
    }

    // Filtrar movimientos que dejan al rey en jaque
    return moves.filter((move) => {
      const tempBoard = cloneBoard(boardState);
      makeTempMove(tempBoard, row, col, move.row, move.col, move.specialMove);
      return !isKingInCheck(color, tempBoard);
    });
  }

  function isInBounds(row, col) {
    return row >= 0 && row < 8 && col >= 0 && col < 8;
  }

  function movePiece(
    fromRow,
    fromCol,
    toRow,
    toCol,
    specialMove = null,
    promotionType = "queen"
  ) {
    const piece = boardState[fromRow][fromCol];

    // Guardar información para captura al paso
    lastMove = {
      piece: { ...piece },
      from: { row: fromRow, col: fromCol },
      to: { row: toRow, col: toCol },
    };

    // Manejar movimientos especiales
    if (specialMove === "enPassant") {
      // Captura al paso: eliminar el peón capturado
      const capturedPawnRow = fromRow;
      const capturedPawnCol = toCol;
      boardState[capturedPawnRow][capturedPawnCol] = null;
    } else if (specialMove === "castleKingside") {
      // Enroque corto: mover la torre
      boardState[toRow][5] = boardState[toRow][7];
      boardState[toRow][7] = null;
      boardState[toRow][5].hasMoved = true;
    } else if (specialMove === "castleQueenside") {
      // Enroque largo: mover la torre
      boardState[toRow][3] = boardState[toRow][0];
      boardState[toRow][0] = null;
      boardState[toRow][3].hasMoved = true;
    }

    // Mover la pieza
    boardState[toRow][toCol] = piece;
    boardState[fromRow][fromCol] = null;
    piece.hasMoved = true;

    // Actualizar derechos de enroque
    if (piece.type === "king") {
      castlingRights[piece.color].kingside = false;
      castlingRights[piece.color].queenside = false;
    } else if (piece.type === "rook") {
      if (fromCol === 0) {
        // Torre de queenside
        castlingRights[piece.color].queenside = false;
      } else if (fromCol === 7) {
        // Torre de kingside
        castlingRights[piece.color].kingside = false;
      }
    }

    // Coronación de peón
    if (piece.type === "pawn" && (toRow === 0 || toRow === 7)) {
      boardState[toRow][toCol] = {
        type: promotionType,
        color: piece.color,
        hasMoved: true,
      };
    }
  }

  function makeTempMove(
    board,
    fromRow,
    fromCol,
    toRow,
    toCol,
    specialMove = null
  ) {
    const piece = board[fromRow][fromCol];

    if (specialMove === "enPassant") {
      const capturedPawnRow = fromRow;
      const capturedPawnCol = toCol;
      board[capturedPawnRow][capturedPawnCol] = null;
    } else if (specialMove === "castleKingside") {
      board[toRow][5] = board[toRow][7];
      board[toRow][7] = null;
    } else if (specialMove === "castleQueenside") {
      board[toRow][3] = board[toRow][0];
      board[toRow][0] = null;
    }

    board[toRow][toCol] = piece;
    board[fromRow][fromCol] = null;
  }

  function cloneBoard(board) {
    return board.map((row) =>
      row.map((piece) => (piece ? { ...piece } : null))
    );
  }

  function isKingInCheck(color, customBoard = null) {
    const board = customBoard || boardState;
    let kingPos = null;

    // Encontrar la posición del rey
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece && piece.type === "king" && piece.color === color) {
          kingPos = { row, col };
          break;
        }
      }
      if (kingPos) break;
    }

    // Verificar si alguna pieza enemiga puede atacar al rey
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece && piece.color !== color) {
          const moves = getPseudoLegalMoves(row, col, board);
          if (
            moves.some((m) => m.row === kingPos.row && m.col === kingPos.col)
          ) {
            return true;
          }
        }
      }
    }

    return false;
  }

  function isSquareUnderAttack(row, col, color) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = boardState[r][c];
        if (piece && piece.color !== color) {
          const moves = getPseudoLegalMoves(r, c, boardState);
          if (moves.some((m) => m.row === row && m.col === col)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  function getPseudoLegalMoves(row, col, board) {
    const piece = board[row][col];
    if (!piece) return [];

    const moves = [];
    const color = piece.color;
    const enemyColor = color === "white" ? "black" : "white";

    // Similar a getValidMoves pero sin verificar jaque
    switch (piece.type) {
      case "pawn":
        const direction = color === "white" ? 1 : -1;
        const startRow = color === "white" ? 1 : 6;

        // Capturas diagonales
        for (const colOffset of [-1, 1]) {
          const newCol = col + colOffset;
          if (isInBounds(row + direction, newCol)) {
            const targetPiece = board[row + direction][newCol];
            if (targetPiece && targetPiece.color === enemyColor) {
              moves.push({ row: row + direction, col: newCol });
            }
          }
        }
        break;

      case "rook":
        for (const [dr, dc] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          let r = row + dr,
            c = col + dc;
          while (isInBounds(r, c)) {
            if (!board[r][c]) {
              moves.push({ row: r, col: c });
            } else {
              if (board[r][c].color === enemyColor) {
                moves.push({ row: r, col: c });
              }
              break;
            }
            r += dr;
            c += dc;
          }
        }
        break;

      // Implementaciones similares para otras piezas...
    }

    return moves;
  }

  function checkGameState() {
    // Verificar jaque mate o tablas
    const hasLegalMoves = boardState.some((row, rowIndex) =>
      row.some(
        (piece, colIndex) =>
          piece &&
          piece.color === currentPlayer &&
          getValidMoves(rowIndex, colIndex).length > 0
      )
    );

    if (!hasLegalMoves) {
      gameState = isKingInCheck(currentPlayer) ? "checkmate" : "stalemate";
    } else {
      gameState = isKingInCheck(currentPlayer) ? "check" : "playing";
    }
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
    lastMove = null;
    pendingPromotion = null;
    castlingRights = {
      white: { kingside: true, queenside: true },
      black: { kingside: true, queenside: true },
    };
    hidePromotionModal();
    renderBoard();
  }
});
