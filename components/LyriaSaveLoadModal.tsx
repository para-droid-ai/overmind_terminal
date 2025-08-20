
import React, { useRef } from 'react';

interface LyriaSaveLoadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  onLoad: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const LyriaSaveLoadModal: React.FC<LyriaSaveLoadModalProps> = ({ isOpen, onClose, onSave, onLoad }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleLoadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onLoad(event);
    onClose(); // Close modal after file selection attempt
  };

  return (
    <div
      className="fixed inset-0 bg-[var(--color-bg-terminal)] bg-opacity-75 flex items-center justify-center z-[60] p-4" // Ensure z-index is higher than LyriaModal
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="lyria-saveload-title"
    >
      <div
        className="bg-[var(--color-bg-modal)] border-2 border-[var(--color-border-base)] shadow-xl shadow-[var(--color-shadow-base)]/50 rounded-lg p-6 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 id="lyria-saveload-title" className="text-xl font-bold text-[var(--color-text-heading)]">Lyria Settings Data</h2>
          <button
            onClick={onClose}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text-heading)] focus-ring-accent p-1 rounded-full"
            aria-label="Close Lyria save/load"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => { onSave(); onClose(); }}
            className="w-full bg-[var(--color-bg-button-primary)] text-[var(--color-text-button-primary)] hover:bg-[var(--color-bg-button-primary-hover)] px-4 py-2.5 rounded-sm focus-ring-primary text-sm font-semibold uppercase tracking-wider"
          >
            Save Current Lyria Settings
          </button>
          <button
            onClick={handleLoadClick}
            className="w-full bg-[var(--color-bg-button-secondary)] text-[var(--color-text-button-secondary)] hover:bg-[var(--color-bg-button-secondary-hover)] px-4 py-2.5 rounded-sm focus-ring-accent text-sm font-semibold uppercase tracking-wider"
          >
            Load Lyria Settings from File
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept=".json"
            aria-label="Load Lyria settings file"
          />
        </div>
         <p className="text-xs text-[var(--color-text-muted)] mt-4 text-center">
            Saving captures current prompts and advanced configurations. Loading will replace current settings.
        </p>
      </div>
    </div>
  );
};

export default LyriaSaveLoadModal;
