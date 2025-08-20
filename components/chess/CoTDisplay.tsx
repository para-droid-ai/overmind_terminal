
import React, { useState } from 'react';
import { ChessMoveDetail, PlayerColor } from '../../types';

interface CoTDisplayProps {
  title: string;
  currentCot: string;
  history: ChessMoveDetail[];
  isLoading: boolean;
  playerNameColor: string;
  successTurns: number;
  failedTurns: number;
}

const CoTDisplay: React.FC<CoTDisplayProps> = ({
    title,
    currentCot,
    history,
    isLoading,
    playerNameColor,
    successTurns,
    failedTurns
}) => {
  const [showHistoryView, setShowHistoryView] = useState(false);

  const formattedTitle = `${title} (S:${successTurns}/F:${failedTurns}) - Chain of Thought`;

  return (
    // Main container: Added overflow-hidden to ensure padding doesn't break height constraint.
    <div className="bg-[var(--color-bg-terminal)] border-2 border-[var(--color-border-base)] shadow-md p-3 h-full overflow-hidden">
      {/* Inner Wrapper: This is the flex container that manages header and content. Added min-h-0. */}
      <div className="h-full flex flex-col overflow-hidden min-h-0"> {/* Added min-h-0 here */}
        {/* Header: fixed height, does not shrink */}
        <div className="flex justify-between items-center border-b border-[var(--color-border-strong)] pb-1 mb-2 flex-shrink-0">
          <h3 className={`text-sm font-bold ${playerNameColor}`}>
            {isLoading && !showHistoryView ? `${title} - Analyzing...` : formattedTitle}
          </h3>
          {history.length > 0 && (
            <button
              onClick={() => setShowHistoryView(!showHistoryView)}
              className="text-[9px] px-1.5 py-0.5 bg-[var(--color-bg-button-secondary)] text-[var(--color-text-button-secondary)] rounded hover:bg-[var(--color-bg-button-secondary-hover)] focus-ring-accent"
            >
              {showHistoryView ? 'Current' : `History (${history.length})`}
            </button>
          )}
        </div>
        {/* Scrollable Content Area: grows to fill space, allows vertical scroll */}
        <div className="text-xs text-[var(--color-text-muted)] overflow-y-auto flex-grow min-h-0 log-display">
          {showHistoryView ? (
            history.length > 0 ? (
              history.slice().reverse().map((move, idx) => (
                <div key={`cot-hist-${move.moveTimestamp}-${move.player}-${idx}`} className={`p-1 border-b border-dashed border-[var(--color-border-strong)] border-opacity-20 last:border-b-0 ${idx === 0 ? 'bg-black bg-opacity-10' : ''}`}>
                  <p className="font-semibold text-[var(--color-text-muted)] text-[10px]">
                    Move {history.length - idx} ({move.player === PlayerColor.WHITE ? 'W' : 'B'}: {move.uci}):
                  </p>
                  <p className="whitespace-pre-wrap break-words text-[11px]">{move.cot}</p>
                </div>
              ))
            ) : (
              <p>No CoT history available.</p>
            )
          ) : (
            isLoading ? (
              <p className="animate-pulse">Analyzing position...</p>
            ) : currentCot ? (
              <p className="whitespace-pre-wrap break-words">{currentCot}</p>
            ) : (
              <p>Awaiting first move analysis...</p>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default CoTDisplay;

