
import React from 'react';
import { ImageSnapshot } from '../../types';

interface ImageModalProps {
  snapshot: ImageSnapshot;
  allSnapshots: ImageSnapshot[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (newIndex: number) => void;
}

const ImageModal: React.FC<ImageModalProps> = ({ snapshot, allSnapshots, currentIndex, onClose, onNavigate }) => {
  const handlePrev = () => {
    if (currentIndex > 0) {
      onNavigate(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < allSnapshots.length - 1) {
      onNavigate(currentIndex + 1);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-[var(--color-bg-terminal)] bg-opacity-80 flex items-center justify-center z-[100] p-4"
      onClick={onClose} // Close on overlay click
      role="dialog"
      aria-modal="true"
      aria-labelledby="image-modal-prompt"
    >
      <div
        className="bg-[var(--color-bg-modal)] border-2 border-[var(--color-border-base)] shadow-xl shadow-[var(--color-shadow-base)]/50 rounded-lg p-4 max-w-3xl w-full max-h-[90vh] flex flex-col text-[var(--color-text-base)] animate-breathing-border"
        onClick={(e) => e.stopPropagation()} // Prevent click inside from closing modal
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 md:top-5 md:right-5 text-[var(--color-text-muted)] hover:text-[var(--color-text-heading)] focus-ring-accent p-1.5 rounded-full bg-[var(--color-bg-panel)] hover:bg-[var(--color-bg-button-secondary-hover)] z-[101]"
          aria-label="Close image view"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Image Display Area */}
        <div className="relative flex-grow flex items-center justify-center overflow-hidden mb-3">
          <img
            src={snapshot.url}
            alt={snapshot.prompt}
            className="max-w-full max-h-[calc(80vh-120px)] object-contain rounded"
          />
           {/* Navigation Buttons */}
            {allSnapshots.length > 1 && (
            <>
                <button
                    onClick={handlePrev}
                    disabled={currentIndex === 0}
                    className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 bg-[var(--color-bg-button-secondary)] text-[var(--color-text-button-secondary)] hover:bg-[var(--color-bg-button-secondary-hover)] p-2 rounded-full focus-ring-accent disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Previous image"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 md:w-6 md:h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                    </svg>
                </button>
                <button
                    onClick={handleNext}
                    disabled={currentIndex === allSnapshots.length - 1}
                    className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 bg-[var(--color-bg-button-secondary)] text-[var(--color-text-button-secondary)] hover:bg-[var(--color-bg-button-secondary-hover)] p-2 rounded-full focus-ring-accent disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Next image"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 md:w-6 md:h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                </button>
            </>
            )}
        </div>

        {/* Prompt Area */}
        <div className="flex-shrink-0 max-h-28 overflow-y-auto log-display p-2 bg-black bg-opacity-30 rounded mt-auto">
          <p id="image-modal-prompt" className="text-sm text-[var(--color-text-muted)] italic whitespace-pre-wrap">
            {snapshot.prompt}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ImageModal;
