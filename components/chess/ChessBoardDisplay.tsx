
import React from 'react';
import { ChessBoardState, ChessSquare, PlayerColor } from '../../types';
import { getPieceUnicode } from '../../utils/chessLogic';

interface ChessBoardDisplayProps {
  board: ChessBoardState;
  onSquareClick?: (row: number, col: number) => void; // For future player interaction
  selectedSquare?: { row: number; col: number } | null;
  lastMove?: { from: { row: number; col: number }; to: { row: number; col: number } } | null;
  playerPerspective?: PlayerColor; // To optionally flip board
}

const ChessBoardDisplay: React.FC<ChessBoardDisplayProps> = ({
  board,
  onSquareClick,
  selectedSquare,
  lastMove,
  playerPerspective = PlayerColor.WHITE,
}) => {
  const renderSquare = (square: ChessSquare, r_idx: number, c_idx: number) => {
    const pieceUnicode = square ? getPieceUnicode(square.symbol, square.color) : '';
    const isLightSquare = (r_idx + c_idx) % 2 === 0;
    
    // Increased square size and text size
    let squareClasses = `w-16 h-16 md:w-20 md:h-20 flex items-center justify-center text-5xl md:text-6xl cursor-pointer transition-colors duration-150 `;
    squareClasses += isLightSquare ? 'bg-amber-100 hover:bg-amber-200' : 'bg-amber-600 hover:bg-amber-700';

    if (selectedSquare && selectedSquare.row === r_idx && selectedSquare.col === c_idx) {
      squareClasses += isLightSquare ? ' bg-yellow-300' : ' bg-yellow-500';
    }
    if (lastMove) {
      if ((lastMove.from.row === r_idx && lastMove.from.col === c_idx) || (lastMove.to.row === r_idx && lastMove.to.col === c_idx)) {
        squareClasses += isLightSquare ? ' bg-lime-300 ring-2 ring-lime-500' : ' bg-lime-500 ring-2 ring-lime-700';
      }
    }

    return (
      <div
        key={`${r_idx}-${c_idx}`}
        className={squareClasses}
        onClick={() => onSquareClick && onSquareClick(r_idx, c_idx)}
        role="button"
        aria-label={`Square ${String.fromCharCode(97 + c_idx)}${8 - r_idx}${square ? `, ${square.color === PlayerColor.WHITE ? 'White' : 'Black'} ${square.symbol}` : ''}`}
      >
        <span style={{ color: square?.color === PlayerColor.BLACK ? '#333' : '#FFF', textShadow: square?.color === PlayerColor.BLACK ? '0 0 2px #FFF, 0 0 2px #FFF' : '0 0 2px #000, 0 0 2px #000' }}>
          {pieceUnicode}
        </span>
      </div>
    );
  };

  const boardRows = playerPerspective === PlayerColor.WHITE ? board : [...board].reverse().map(row => [...row].reverse());

  return (
    <div className="grid grid-cols-8 border-2 border-amber-800 shadow-xl bg-amber-800 w-max mx-auto">
      {boardRows.map((row, r_idx) =>
        row.map((square, c_idx) => renderSquare(square, 
            playerPerspective === PlayerColor.WHITE ? r_idx : 7 - r_idx, 
            playerPerspective === PlayerColor.WHITE ? c_idx : 7 - c_idx
        ))
      )}
    </div>
  );
};

export default ChessBoardDisplay;
