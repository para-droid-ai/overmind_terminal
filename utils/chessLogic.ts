import { ChessBoardState, ChessPiece, ChessSquare, PieceSymbol, PlayerColor, UCIMove } from '../types';

export const INITIAL_BOARD_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export interface MoveValidationResult {
  isValid: boolean;
  reason?: string;
  isCapture?: boolean;
  capturedPiece?: ChessPiece | null; 
}

export function getPieceUnicode(piece: PieceSymbol, color: PlayerColor): string {
  switch (color) {
    case PlayerColor.WHITE:
      switch (piece) {
        case PieceSymbol.KING: return '♔';
        case PieceSymbol.QUEEN: return '♕';
        case PieceSymbol.ROOK: return '♖';
        case PieceSymbol.BISHOP: return '♗';
        case PieceSymbol.KNIGHT: return '♘';
        case PieceSymbol.PAWN: return '♙';
      }
      break;
    case PlayerColor.BLACK:
      switch (piece) {
        case PieceSymbol.KING: return '♚';
        case PieceSymbol.QUEEN: return '♛';
        case PieceSymbol.ROOK: return '♜';
        case PieceSymbol.BISHOP: return '♝';
        case PieceSymbol.KNIGHT: return '♞';
        case PieceSymbol.PAWN: return '♟︎'; // Note: Added U+FE0E for explicit rendering
      }
      break;
  }
  return '';
}

export function isFenPotentiallyValid(fen: string): { isValid: boolean; reason?: string } {
  const parts = fen.split(' ');
  if (parts.length !== 6) {
    return { isValid: false, reason: "FEN does not have 6 parts." };
  }
  const piecePlacement = parts[0];
  if (!piecePlacement.includes('k')) {
    return { isValid: false, reason: "Missing Black King (k)." };
  }
  if (!piecePlacement.includes('K')) {
    return { isValid: false, reason: "Missing White King (K)." };
  }
  // Basic check for 8 ranks (7 slashes)
  if ((piecePlacement.match(/\//g) || []).length !== 7) {
    return { isValid: false, reason: "Piece placement does not have 8 ranks (missing slashes)." };
  }
  return { isValid: true };
}

export function fenToBoard(fen: string): { board: ChessBoardState; currentPlayer: PlayerColor; castling: string; enPassant: string; halfMove: number; fullMove: number; } {
  const parts = fen.split(' ');
  const piecePlacement = parts[0];
  const rows = piecePlacement.split('/');

  const board: ChessBoardState = Array(8).fill(null).map(() => Array(8).fill(null));

  for (let r = 0; r < 8; r++) {
    let c = 0;
    for (const char of rows[r]) {
      if (isNaN(parseInt(char))) {
        const color = char === char.toUpperCase() ? PlayerColor.WHITE : PlayerColor.BLACK;
        const symbol = char.toLowerCase() as PieceSymbol;
        board[r][c] = { symbol, color };
        c++;
      } else {
        c += parseInt(char);
      }
    }
  }
  return {
    board,
    currentPlayer: parts[1] as PlayerColor,
    castling: parts[2],
    enPassant: parts[3],
    halfMove: parseInt(parts[4]),
    fullMove: parseInt(parts[5]),
  };
}

export function boardToFen(
    board: ChessBoardState, 
    currentPlayer: PlayerColor, 
    castling: string, 
    enPassant: string, 
    halfMove: number, 
    fullMove: number
): string {
  let fen = "";
  for (let r = 0; r < 8; r++) {
    let emptyCount = 0;
    for (let c = 0; c < 8; c++) {
      const square = board[r][c];
      if (square) {
        if (emptyCount > 0) {
          fen += emptyCount;
          emptyCount = 0;
        }
        fen += square.color === PlayerColor.WHITE ? square.symbol.toUpperCase() : square.symbol.toLowerCase();
      } else {
        emptyCount++;
      }
    }
    if (emptyCount > 0) {
      fen += emptyCount;
    }
    if (r < 7) {
      fen += "/";
    }
  }
  fen += ` ${currentPlayer} ${castling} ${enPassant} ${halfMove} ${fullMove}`;
  return fen;
}


export function uciToCoords(uciMove: string): UCIMove | null {
  if (uciMove.length < 4 || uciMove.length > 5) return null;
  const fromColChar = uciMove[0];
  const fromRowChar = uciMove[1];
  const toColChar = uciMove[2];
  const toRowChar = uciMove[3];
  const promotionChar = uciMove.length === 5 ? uciMove[4] : undefined;

  const colMap: { [key: string]: number } = { 'a': 0, 'b': 1, 'c': 2, 'd': 3, 'e': 4, 'f': 5, 'g': 6, 'h': 7 };
  
  const fromCol = colMap[fromColChar];
  const fromRow = 8 - parseInt(fromRowChar);
  const toCol = colMap[toColChar];
  const toRow = 8 - parseInt(toRowChar);

  if (fromCol === undefined || isNaN(fromRow) || toCol === undefined || isNaN(toRow) ||
      fromRow < 0 || fromRow > 7 || fromCol < 0 || fromCol > 7 ||
      toRow < 0 || toRow > 7 || toCol < 0 || toCol > 7) {
    return null;
  }
  
  let promotionPiece: PieceSymbol | undefined = undefined;
  if (promotionChar) {
    const validPromotionSymbols = [PieceSymbol.QUEEN, PieceSymbol.ROOK, PieceSymbol.BISHOP, PieceSymbol.KNIGHT];
    if (validPromotionSymbols.includes(promotionChar as PieceSymbol)) {
      promotionPiece = promotionChar as PieceSymbol;
    } else {
      return null; // Invalid promotion character
    }
  }

  return {
    from: { row: fromRow, col: fromCol },
    to: { row: toRow, col: toCol },
    promotion: promotionPiece,
  };
}

export function applyMoveToBoard(board: ChessBoardState, uciMove: UCIMove): ChessBoardState {
  const newBoard = board.map(row => row.slice()) as ChessBoardState; // Deep copy
  const pieceToMove = newBoard[uciMove.from.row][uciMove.from.col];

  if (pieceToMove) {
    // Standard move part
    newBoard[uciMove.to.row][uciMove.to.col] = pieceToMove;
    newBoard[uciMove.from.row][uciMove.from.col] = null;

    // Handle castling rook movement
    if (pieceToMove.symbol === PieceSymbol.KING) {
      const colDiff = uciMove.to.col - uciMove.from.col;
      if (colDiff === 2) { // Kingside castle
        const rook = newBoard[uciMove.from.row][7]; 
        if (rook && rook.symbol === PieceSymbol.ROOK && rook.color === pieceToMove.color) {
            newBoard[uciMove.from.row][5] = rook; 
            newBoard[uciMove.from.row][7] = null;
        }
      } else if (colDiff === -2) { // Queenside castle
        const rook = newBoard[uciMove.from.row][0]; 
         if (rook && rook.symbol === PieceSymbol.ROOK && rook.color === pieceToMove.color) {
            newBoard[uciMove.from.row][3] = rook; 
            newBoard[uciMove.from.row][0] = null;
        }
      }
    }

    // Handle promotion
    if (uciMove.promotion && pieceToMove.symbol === PieceSymbol.PAWN) {
      if ((pieceToMove.color === PlayerColor.WHITE && uciMove.to.row === 0) ||
          (pieceToMove.color === PlayerColor.BLACK && uciMove.to.row === 7)) {
        newBoard[uciMove.to.row][uciMove.to.col] = { ...pieceToMove, symbol: uciMove.promotion };
      }
    }
  }
  return newBoard;
}

export function isMoveValid(
    board: ChessBoardState,
    uciMove: UCIMove,
    player: PlayerColor,
    enPassantTargetSquareFen: string // e.g., "e3" or "-"
): MoveValidationResult {
    const { from, to, promotion } = uciMove;
    const piece = board[from.row]?.[from.col];

    if (!piece) {
        return { isValid: false, reason: `No piece at source square ${String.fromCharCode(97 + from.col)}${8 - from.row}.` };
    }
    if (piece.color !== player) {
        return { isValid: false, reason: `Piece at ${String.fromCharCode(97 + from.col)}${8 - from.row} is not player's piece (is ${piece.color}, player is ${player}).` };
    }

    const targetPiece = board[to.row]?.[to.col];
    if (targetPiece && targetPiece.color === player) {
        return { isValid: false, reason: `Cannot capture own piece at ${String.fromCharCode(97 + to.col)}${8 - to.row}.` };
    }
    
    const isCapture = !!targetPiece;
    const dr = to.row - from.row;
    const dc = to.col - from.col;

    switch (piece.symbol) {
        case PieceSymbol.PAWN:
            const direction = player === PlayerColor.WHITE ? -1 : 1;
            // Standard 1-square move
            if (dc === 0 && dr === direction && !targetPiece) { /* Allow */ }
            // Initial 2-square move
            else if (dc === 0 && dr === 2 * direction && ((player === PlayerColor.WHITE && from.row === 6) || (player === PlayerColor.BLACK && from.row === 1)) && !targetPiece && !board[from.row + direction]?.[from.col]) { /* Allow */ }
            // Capture
            else if (Math.abs(dc) === 1 && dr === direction && targetPiece && targetPiece.color !== player) { /* Allow */ }
            // En Passant
            else if (enPassantTargetSquareFen !== "-") {
                const epCol = enPassantTargetSquareFen.charCodeAt(0) - 'a'.charCodeAt(0);
                const epRow = 8 - parseInt(enPassantTargetSquareFen[1]);
                if (Math.abs(dc) === 1 && dr === direction && to.row === epRow && to.col === epCol && !targetPiece) {
                    // For en passant, the captured pawn is on the same rank as 'from' and same col as 'to'
                    const capturedPawnRow = from.row;
                    const capturedPawnCol = to.col;
                    const epCapturedPiece = board[capturedPawnRow]?.[capturedPawnCol];
                    if (epCapturedPiece && epCapturedPiece.symbol === PieceSymbol.PAWN && epCapturedPiece.color !== player) {
                         // Valid en passant capture
                    } else {
                        return { isValid: false, reason: "Invalid en passant attempt (target square not empty or conditions met)." };
                    }
                } else if (Math.abs(dc) === 1 && dr === direction && targetPiece && targetPiece.color !== player) {
                    // This is a regular capture, not en passant related to the target square check
                } else if (Math.abs(dc) === 1 && dr === direction && !targetPiece && (to.row !== epRow || to.col !== epCol) ) {
                     return { isValid: false, reason: "Pawn diagonal move must be a capture or valid en passant." };
                } else if (!(dc === 0 && dr === direction && !targetPiece) && !(dc === 0 && dr === 2 * direction && ((player === PlayerColor.WHITE && from.row === 6) || (player === PlayerColor.BLACK && from.row === 1)) && !targetPiece && !board[from.row + direction]?.[from.col])) {
                     return { isValid: false, reason: "Invalid pawn move." };
                }
            }
            else if (!(dc === 0 && dr === direction && !targetPiece) && !(dc === 0 && dr === 2 * direction && ((player === PlayerColor.WHITE && from.row === 6) || (player === PlayerColor.BLACK && from.row === 1)) && !targetPiece && !board[from.row + direction]?.[from.col])) {
                 return { isValid: false, reason: "Invalid pawn move." };
            }

            if (promotion) {
                if (!((player === PlayerColor.WHITE && to.row === 0) || (player === PlayerColor.BLACK && to.row === 7))) {
                    return { isValid: false, reason: "Pawn promotion attempted on incorrect rank." };
                }
            }
            break;
        case PieceSymbol.KNIGHT:
            if (!((Math.abs(dr) === 2 && Math.abs(dc) === 1) || (Math.abs(dr) === 1 && Math.abs(dc) === 2))) {
                return { isValid: false, reason: "Invalid knight move pattern." };
            }
            break;
        case PieceSymbol.BISHOP:
        case PieceSymbol.ROOK:
        case PieceSymbol.QUEEN:
            if (piece.symbol === PieceSymbol.BISHOP && Math.abs(dr) !== Math.abs(dc)) {
                return { isValid: false, reason: "Bishop must move diagonally." };
            }
            if (piece.symbol === PieceSymbol.ROOK && dr !== 0 && dc !== 0) {
                return { isValid: false, reason: "Rook must move horizontally or vertically." };
            }
            if (piece.symbol === PieceSymbol.QUEEN && Math.abs(dr) !== Math.abs(dc) && dr !== 0 && dc !== 0) {
                return { isValid: false, reason: "Invalid queen move pattern." };
            }

            // Path check for sliding pieces
            const stepR = dr === 0 ? 0 : dr / Math.abs(dr);
            const stepC = dc === 0 ? 0 : dc / Math.abs(dc);
            let r = from.row + stepR;
            let c = from.col + stepC;
            while (r !== to.row || c !== to.col) {
                if (board[r]?.[c]) {
                    return { isValid: false, reason: `Path blocked for ${piece.symbol} at ${String.fromCharCode(97 + c)}${8 - r}.` };
                }
                r += stepR;
                c += stepC;
            }
            break;
        case PieceSymbol.KING:
            if (Math.abs(dr) > 1 || Math.abs(dc) > 2) { // dc > 1 for castling
                return { isValid: false, reason: "King moved too far." };
            }
            if (Math.abs(dc) === 2 && dr === 0) { // Castling UCI move
                // Basic pattern for UCI castling like e1g1. Full legality (rights, path, checks) complex.
            } else if (!(Math.abs(dr) <= 1 && Math.abs(dc) <= 1)) {
                 return { isValid: false, reason: "Invalid king move pattern." };
            }
            break;
    }
    // TODO: Add check for "does this move leave king in check?" (requires more complex logic)
    return { isValid: true, isCapture, capturedPiece: targetPiece };
}

export function getGameStatus(board: ChessBoardState, currentPlayer: PlayerColor): string {
  return `${currentPlayer === PlayerColor.WHITE ? 'White' : 'Black'} to move.`;
}
