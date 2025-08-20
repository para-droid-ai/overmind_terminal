import React, { useRef } from 'react';

interface StoryWeaverSaveLoadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  onLoad: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onExportStoryBookMD: () => void;
  onExportStoryBookPDF: () => void;
  hasStoryContent: boolean;
}

const StoryWeaverSaveLoadModal: React.FC<StoryWeaverSaveLoadModalProps> = ({ isOpen, onClose, onSave, onLoad, onExportStoryBookMD, onExportStoryBookPDF, hasStoryContent }) => {
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
      className="fixed inset-0 bg-[var(--color-bg-terminal)] bg-opacity-75 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="storyweaver-saveload-title"
    >
      <div
        className="bg-[var(--color-bg-modal)] border-2 border-[var(--color-border-base)] shadow-xl shadow-[var(--color-shadow-base)]/50 rounded-lg p-6 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 id="storyweaver-saveload-title" className="text-xl font-bold text-[var(--color-text-heading)]">Story Data</h2>
          <button
            onClick={onClose}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text-heading)] focus-ring-accent p-1 rounded-full"
            aria-label="Close save/load"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => { onSave(); onClose(); }}
            disabled={!hasStoryContent}
            className="w-full bg-[var(--color-bg-button-primary)] text-[var(--color-text-button-primary)] hover:bg-[var(--color-bg-button-primary-hover)] px-4 py-2.5 rounded-sm focus-ring-primary text-sm font-semibold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Current Story Session (.json)
          </button>
          <button
            onClick={() => { onExportStoryBookPDF(); onClose(); }}
            disabled={!hasStoryContent}
            className="w-full bg-indigo-600 text-white hover:bg-indigo-700 border-indigo-700 border-2 px-4 py-2.5 rounded-sm focus-ring-primary text-sm font-semibold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Export Story Book (.pdf)
          </button>
          <button
            onClick={() => { onExportStoryBookMD(); onClose(); }}
            disabled={!hasStoryContent}
            className="w-full bg-cyan-600 text-white hover:bg-cyan-700 border-cyan-700 border-2 px-4 py-2.5 rounded-sm focus-ring-primary text-sm font-semibold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Export Story Book (.md)
          </button>
          <button
            onClick={handleLoadClick}
            className="w-full bg-[var(--color-bg-button-secondary)] text-[var(--color-text-button-secondary)] hover:bg-[var(--color-bg-button-secondary-hover)] px-4 py-2.5 rounded-sm focus-ring-accent text-sm font-semibold uppercase tracking-wider"
          >
            Load Story from File...
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept=".json"
            aria-label="Load Story Weaver session file"
          />
        </div>
         <p className="text-xs text-[var(--color-text-muted)] mt-4 text-center">
            Saving captures the interactive session. Exporting creates a shareable file with images. Loading replaces the current story.
        </p>
      </div>
    </div>
  );
};

export default StoryWeaverSaveLoadModal;