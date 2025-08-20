
import React from 'react';
import { BattleReportData, ThemeColors, NoosphericPlayerId } from '../../types';
import { AI1_NAME, AI2_NAME, EVOLVED_UNIT_COMBAT_BONUS } from '../../constants'; // Added EVOLVED_UNIT_COMBAT_BONUS

interface BattleReportModalProps {
  report: BattleReportData;
  factionColors: ThemeColors; // Pass the full theme object for color access
  onClose: () => void;
}

const BattleReportModal: React.FC<BattleReportModalProps> = ({ report, factionColors, onClose }) => {
  const getFactionName = (id: NoosphericPlayerId | string) => { // Allow string for defender in dice roll
    if (id === 'GEM-Q') return AI1_NAME;
    if (id === 'AXIOM') return AI2_NAME;
    if (id === 'NEUTRAL') return 'Neutral';
    return String(id); // Fallback for other IDs if any
  };

  const getFactionColor = (id: NoosphericPlayerId | string) => { // Allow string
    if (id === 'GEM-Q') return factionColors.ai1TextColor;
    if (id === 'AXIOM') return factionColors.ai2TextColor;
    return factionColors.textMuted;
  };

  const outcomeColor = report.outcome === 'ATTACKER_WINS' ? factionColors.primary500 : 
                       report.outcome === 'DEFENDER_WINS' ? factionColors.errorColor : 
                       factionColors.systemMessageColor;

  return (
    <div
      className="fixed inset-0 bg-[var(--color-bg-terminal)] bg-opacity-80 flex items-center justify-center z-50 p-4"
      onClick={onClose} // Close on overlay click
      role="dialog"
      aria-modal="true"
      aria-labelledby="battle-report-title"
    >
      <div
        className="bg-[var(--color-bg-modal)] border-2 border-[var(--color-border-base)] shadow-xl shadow-[var(--color-shadow-base)]/50 rounded-lg p-5 max-w-lg w-full max-h-[90vh] flex flex-col" // Increased max-w, max-h and added flex flex-col
        onClick={(e) => e.stopPropagation()} // Prevent click inside from closing modal
      >
        <div className="flex justify-between items-center mb-3 flex-shrink-0">
          <h2 id="battle-report-title" className="text-lg font-bold text-[var(--color-text-heading)]">
            Battle Report: {report.nodeName}
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text-heading)] focus-ring-accent p-1 rounded-full"
            aria-label="Close battle report"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-2 text-sm text-[var(--color-text-base)] overflow-y-auto flex-grow pr-2 log-display custom-scrollbar"> {/* Added scrollbar and padding */}
          <div className="grid grid-cols-2 gap-2 items-start">
            <div>
              <h3 className="font-semibold" style={{ color: getFactionColor(report.attacker) }}>
                Attacker: {getFactionName(report.attacker)}
              </h3>
              <p>Deployed: {report.attackerInitialUnits}</p>
              <p>Losses: <span className="text-[var(--color-error)]">{report.attackerLosses}</span></p>
            </div>
            <div>
              <h3 className="font-semibold" style={{ color: getFactionColor(report.defender) }}>
                Defender: {getFactionName(report.defender)}
              </h3>
              <p>Present: {report.defenderInitialUnits}</p>
              <p>Losses: <span className="text-[var(--color-error)]">{report.defenderLosses}</span></p>
            </div>
          </div>
          
          <hr className="border-[var(--color-border-strong)] opacity-50 my-2"/>

          <p className="text-center font-bold text-md" style={{ color: outcomeColor }}>
            Outcome: {report.outcome.replace('_', ' ')}
          </p>

          {report.nodeCaptured && (
            <p className="text-center text-[var(--color-system-message)]">
              Node Captured by {getFactionName(report.attacker)}!
            </p>
          )}
          <p className="text-center">
            Units remaining at {report.nodeName}: {report.unitsRemainingAtNode}
          </p>

          {/* Dice Roll Details Section */}
          {report.diceRolls && report.diceRolls.length > 0 && (
            <>
              <hr className="border-[var(--color-border-strong)] opacity-50 my-2"/>
              <h4 className="font-semibold mt-2 mb-1 text-[var(--color-text-muted)]">Combat Dice Log:</h4>
              <div className="text-xs max-h-48 overflow-y-auto border border-[var(--color-border-strong)] border-opacity-70 p-1.5 rounded bg-[var(--color-bg-input)] bg-opacity-30 space-y-1 custom-scrollbar">
                {report.diceRolls.map((roll, index) => (
                  <div key={index} className="border-b border-dashed border-[var(--color-border-strong)] border-opacity-20 pb-1 mb-1 last:border-b-0 last:pb-0 last:mb-0">
                    <p>
                      <span className="font-semibold">Round {index + 1}:</span>
                      <span style={{ color: getFactionColor(report.attacker) }} className="ml-1">
                        {getFactionName(report.attacker)}: {roll.attackerRoll}
                        {roll.attackerHadEvolved && <span className="text-purple-400 text-xs italic" title={`+${EVOLVED_UNIT_COMBAT_BONUS} from Evolved Units`}> (EVO)</span>}
                      </span>
                      <span className="mx-1">vs</span>
                      <span style={{ color: getFactionColor(report.defender) }}>
                        {getFactionName(report.defender)}: {roll.defenderRoll}
                        {roll.defenderHadEvolved && <span className="text-purple-400 text-xs italic" title={`+${EVOLVED_UNIT_COMBAT_BONUS} from Evolved Units`}> (EVO)</span>}
                      </span>
                    </p>
                    <p className="ml-2 pl-2 border-l border-[var(--color-border-base)] border-opacity-40 text-[var(--color-text-muted)]">{roll.outcome}.</p>
                    <p className="ml-2 pl-2 text-xs opacity-80"> Units A/D: {roll.attackerUnitsRemaining}/{roll.defenderUnitsRemaining}</p>
                  </div>
                ))}
              </div>
            </>
          )}
           {report.diceRolls && report.diceRolls.length === 0 && (
             <p className="text-xs text-center italic text-[var(--color-text-muted)] mt-2">No individual dice rolls (e.g., auto-win vs empty node, or error).</p>
           )}
        </div>

        <button
            onClick={onClose}
            className="mt-4 w-full bg-[var(--color-bg-button-primary)] text-[var(--color-text-button-primary)] hover:bg-[var(--color-bg-button-primary-hover)] px-4 py-2 rounded-sm focus-ring-primary text-sm font-semibold uppercase tracking-wider flex-shrink-0"
        >
            Dismiss
        </button>
        <style>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
            height: 6px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: var(--color-scrollbar-track);
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: var(--color-scrollbar-thumb);
            border-radius: 3px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: var(--color-scrollbar-thumb-hover);
          }
          .custom-scrollbar {
            scrollbar-width: thin;
            scrollbar-color: var(--color-scrollbar-thumb) var(--color-scrollbar-track);
          }
        `}</style>
      </div>
    </div>
  );
};

export default BattleReportModal;
