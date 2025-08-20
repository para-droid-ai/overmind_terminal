import React from 'react';
import { ModeInfo } from '../types';

interface InfoModalProps {
  modeInfo: ModeInfo;
  onClose: () => void;
}

const InfoModal: React.FC<InfoModalProps> = ({ modeInfo, onClose }) => {
  return (
    <div 
      className="fixed inset-0 bg-[var(--color-bg-terminal)] bg-opacity-75 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="info-modal-title"
    >
      <div 
        className="bg-[var(--color-bg-modal)] border-2 border-[var(--color-border-base)] shadow-xl shadow-[var(--color-shadow-base)]/50 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto log-display"
        onClick={(e) => e.stopPropagation()} // Prevent click inside from closing modal
      >
        <div className="flex justify-between items-center mb-4">
          <h2 id="info-modal-title" className="text-xl font-bold text-[var(--color-text-heading)]">{modeInfo.title}</h2>
          <button 
            onClick={onClose} 
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text-heading)] focus-ring-accent p-1 rounded-full"
            aria-label="Close mode information"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="space-y-3 text-sm text-[var(--color-text-base)]">
          <p className="whitespace-pre-wrap leading-relaxed">{modeInfo.overview}</p>
          
          {modeInfo.objective && (
            <div>
              <h3 className="font-semibold text-[var(--color-text-heading)] mb-1">Objective:</h3>
              <p className="whitespace-pre-wrap leading-relaxed">{modeInfo.objective}</p>
            </div>
          )}

          {modeInfo.keyElements && modeInfo.keyElements.length > 0 && (
            <div>
              <h3 className="font-semibold text-[var(--color-text-heading)] mb-1">Key Elements:</h3>
              <ul className="list-disc list-inside pl-2 space-y-0.5">
                {modeInfo.keyElements.map((item, index) => <li key={index}>{item}</li>)}
              </ul>
            </div>
          )}
            
          {modeInfo.gamePhases && modeInfo.gamePhases.length > 0 && (
            <div>
              <h3 className="font-semibold text-[var(--color-text-heading)] mb-1">Game Phases:</h3>
               <ul className="list-disc list-inside pl-2 space-y-0.5">
                {modeInfo.gamePhases.map((item, index) => <li key={index}>{item}</li>)}
              </ul>
            </div>
          )}

          {modeInfo.aiInteraction && (
            <div>
              <h3 className="font-semibold text-[var(--color-text-heading)] mb-1">AI Interaction:</h3>
              <p className="whitespace-pre-wrap leading-relaxed">{modeInfo.aiInteraction}</p>
            </div>
          )}
          
          {modeInfo.themePrompt && (
            <div>
              <h3 className="font-semibold text-[var(--color-text-heading)] mb-1">Thematic Focus:</h3>
              <p className="whitespace-pre-wrap leading-relaxed">{modeInfo.themePrompt}</p>
            </div>
          )}

          {modeInfo.winning && (
             <div>
              <h3 className="font-semibold text-[var(--color-text-heading)] mb-1">Winning Conditions:</h3>
              <p className="whitespace-pre-wrap leading-relaxed">{modeInfo.winning}</p>
            </div>
          )}
        </div>

        <button 
            onClick={onClose}
            className="mt-6 w-full bg-[var(--color-bg-button-primary)] text-[var(--color-text-button-primary)] hover:bg-[var(--color-bg-button-primary-hover)] px-4 py-2 rounded-sm focus-ring-primary text-sm font-semibold uppercase tracking-wider"
        >
            Close
        </button>
      </div>
    </div>
  );
};

export default InfoModal;
