
import React from 'react';

export interface Modifier {
  id: string; // Can be 'isGreatWarMode', 'isFogOfWarActive', etc.
  label: string;
  description: string;
}

interface NoosphericModifiersModalProps {
  isOpen: boolean;
  onClose: () => void;
  modifiers: Modifier[];
  activeModifiers: Record<string, boolean>;
  onModifierChange: (modifierId: string, isActive: boolean) => void;
}

const NoosphericModifiersModal: React.FC<NoosphericModifiersModalProps> = ({
  isOpen,
  onClose,
  modifiers,
  activeModifiers,
  onModifierChange,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-[var(--color-bg-terminal)] bg-opacity-80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modifiers-modal-title"
    >
      <div
        className="bg-[var(--color-bg-modal)] border-2 border-[var(--color-border-base)] shadow-xl shadow-[var(--color-shadow-base)]/50 rounded-lg p-6 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 id="modifiers-modal-title" className="text-xl font-bold text-[var(--color-text-heading)]">Game Modifiers</h2>
          <button
            onClick={onClose}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text-heading)] focus-ring-accent p-1 rounded-full"
            aria-label="Close modifiers"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="space-y-5">
          {modifiers.map((modifier) => (
            <div key={modifier.id} className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <label htmlFor={modifier.id} className="text-md text-[var(--color-text-base)] cursor-pointer">{modifier.label}</label>
                <div className="relative group">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-[var(--color-text-muted)]">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                  </svg>
                  <div className="absolute bottom-full mb-2 w-64 p-2 bg-[var(--color-bg-terminal)] text-xs text-[var(--color-text-muted)] rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none -translate-x-1/2 left-1/2 z-10">
                    {modifier.description}
                  </div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  id={modifier.id}
                  checked={!!activeModifiers[modifier.id]}
                  onChange={(e) => onModifierChange(modifier.id, e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-focus:ring-2 peer-focus:ring-[var(--color-primary-500)] peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary-500)]"></div>
              </label>
            </div>
          ))}
        </div>

        <button 
            onClick={onClose}
            className="mt-8 w-full bg-[var(--color-bg-button-primary)] text-[var(--color-text-button-primary)] hover:bg-[var(--color-bg-button-primary-hover)] px-4 py-2 rounded-sm focus-ring-primary text-sm font-semibold uppercase tracking-wider"
        >
            Confirm Modifiers
        </button>
      </div>
    </div>
  );
};

export default NoosphericModifiersModal;
