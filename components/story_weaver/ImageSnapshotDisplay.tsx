
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ImageSnapshot } from '../../types';
import ImageModal from './ImageModal'; // Import the new modal component

interface ImageSnapshotDisplayProps {
  snapshots: ImageSnapshot[];
  isGenerating: boolean;
}

const ImageSnapshotDisplay: React.FC<ImageSnapshotDisplayProps> = ({ snapshots, isGenerating }) => {
  const [currentMainSnapshotId, setCurrentMainSnapshotId] = useState<string | null>(
    snapshots.length > 0 ? snapshots[snapshots.length - 1].id : null
  );

  useEffect(() => {
    if (snapshots.length > 0) {
      const lastSnapshotId = snapshots[snapshots.length - 1].id;
      // Always update to the latest snapshot when the snapshots array changes.
      // User interaction (clicking a thumbnail) will directly call setCurrentMainSnapshotId,
      // and this effect will re-assert the latest if snapshots array changes again.
      setCurrentMainSnapshotId(lastSnapshotId);
    } else {
      setCurrentMainSnapshotId(null); // No snapshots, no main image
    }
  }, [snapshots]); // Only run when snapshots array itself changes.

  const mainSnapshotToShow = snapshots.find(s => s.id === currentMainSnapshotId) || (snapshots.length > 0 ? snapshots[snapshots.length - 1] : null);
  const thumbnailsToShow = snapshots.filter(s => s.id !== mainSnapshotToShow?.id).slice().reverse(); // Newest of the rest first

  const [selectedSnapshotForModal, setSelectedSnapshotForModal] = useState<ImageSnapshot | null>(null);
  const [modalImageIndex, setModalImageIndex] = useState<number>(0);
  const [focusedThumbnailIndex, setFocusedThumbnailIndex] = useState<number>(-1);

  const thumbnailContainerRef = useRef<HTMLDivElement>(null);

  const openModalWithSnapshot = (snapshot: ImageSnapshot, indexInAllSnapshots: number) => {
    setSelectedSnapshotForModal(snapshot);
    setModalImageIndex(indexInAllSnapshots);
  };

  const closeModal = () => {
    setSelectedSnapshotForModal(null);
  };

  const navigateModal = useCallback((newIndexInAllSnapshots: number) => {
    if (snapshots && snapshots.length > 0) {
      const safeIndex = Math.max(0, Math.min(newIndexInAllSnapshots, snapshots.length - 1));
      setSelectedSnapshotForModal(snapshots[safeIndex]);
      setModalImageIndex(safeIndex);
    }
  }, [snapshots]);

  const handleThumbnailClick = (thumbnailId: string) => {
    setCurrentMainSnapshotId(thumbnailId);
    // Reset focus as the list of thumbnails might change, or the focused one might disappear
    setFocusedThumbnailIndex(-1); 
  };

  const handleThumbnailKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (thumbnailsToShow.length === 0) return;

    let newFocusedIndex = focusedThumbnailIndex;
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      newFocusedIndex = (focusedThumbnailIndex + 1) % thumbnailsToShow.length;
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      newFocusedIndex = (focusedThumbnailIndex - 1 + thumbnailsToShow.length) % thumbnailsToShow.length;
    } else if ((event.key === 'Enter' || event.key === ' ') && focusedThumbnailIndex !== -1 && thumbnailsToShow[focusedThumbnailIndex]) {
      event.preventDefault();
      setCurrentMainSnapshotId(thumbnailsToShow[focusedThumbnailIndex].id);
    }
    setFocusedThumbnailIndex(newFocusedIndex);

    if (thumbnailContainerRef.current) {
      const focusedChild = thumbnailContainerRef.current.children[newFocusedIndex] as HTMLElement;
      if (focusedChild) {
        focusedChild.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      }
    }
  }, [focusedThumbnailIndex, thumbnailsToShow, setCurrentMainSnapshotId]);


  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (selectedSnapshotForModal) {
        if (event.key === 'Escape') {
          closeModal();
        } else if (event.key === 'ArrowRight') {
          navigateModal(modalImageIndex + 1);
        } else if (event.key === 'ArrowLeft') {
          navigateModal(modalImageIndex - 1);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [selectedSnapshotForModal, modalImageIndex, snapshots, navigateModal]);


  return (
    <>
      <div className="bg-[var(--color-bg-panel)] border-2 border-[var(--color-border-base)] rounded-lg shadow-lg flex flex-col h-full overflow-hidden animate-breathing-border">
        <h3 className="text-sm font-bold text-[var(--color-text-heading)] p-3 border-b-2 border-[var(--color-border-base)] flex-shrink-0">
          VISUAL SNAPSHOT
        </h3>
        <div 
          className="flex-grow flex items-center justify-center p-3 relative bg-black bg-opacity-20 min-h-0 cursor-pointer group"
          onClick={() => mainSnapshotToShow && openModalWithSnapshot(mainSnapshotToShow, snapshots.indexOf(mainSnapshotToShow))}
          role="button"
          tabIndex={mainSnapshotToShow ? 0 : -1}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && mainSnapshotToShow) {
              openModalWithSnapshot(mainSnapshotToShow, snapshots.indexOf(mainSnapshotToShow));
            }
          }}
          aria-label={mainSnapshotToShow ? `View snapshot: ${mainSnapshotToShow.prompt}` : "Awaiting visual data"}
        >
          {isGenerating && !mainSnapshotToShow && ( // Show full screen spinner only if no image is available yet
            <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center z-10">
              <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-[var(--color-primary-500)]"></div>
              <p className="mt-4 text-sm text-[var(--color-system-message)] animate-pulse">Generating Image...</p>
            </div>
          )}
          {mainSnapshotToShow ? (
            <div className="w-full h-full flex flex-col">
              <div className="relative flex-grow min-h-0">
                <img
                  src={mainSnapshotToShow.url}
                  alt={mainSnapshotToShow.prompt}
                  className="w-full h-full object-contain rounded transition-transform duration-300 ease-in-out group-hover:scale-105"
                />
                {isGenerating && snapshots.length > 0 && ( // Show smaller spinner if updating and there's an image
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center z-10">
                      <div className="w-8 h-8 border-2 border-dashed rounded-full animate-spin border-[var(--color-primary-500)]"></div>
                      <p className="mt-2 text-xs text-[var(--color-system-message)] animate-pulse">Updating...</p>
                  </div>
                )}
              </div>
              <p className="text-xs text-[var(--color-text-muted)] italic p-2 mt-2 bg-black bg-opacity-30 rounded flex-shrink-0 max-h-20 overflow-y-auto log-display">
                {mainSnapshotToShow.prompt}
              </p>
            </div>
          ) : (
            !isGenerating && (
              <div className="text-center text-[var(--color-text-muted)]">
                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="mt-2 text-sm">Awaiting visual data...</p>
              </div>
            )
          )}
        </div>
        {thumbnailsToShow.length > 0 && (
          <div className="flex-shrink-0 p-2 border-t-2 border-[var(--color-border-base)] bg-black bg-opacity-10">
            <h4 className="text-xs font-semibold text-[var(--color-text-muted)] mb-1.5">History:</h4>
            <div
              ref={thumbnailContainerRef}
              className="flex space-x-2 overflow-x-auto pb-1 thumbnail-scrollbar focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-500)]"
              tabIndex={thumbnailsToShow.length > 0 ? 0 : -1} // Make it focusable if there are thumbnails
              onKeyDown={handleThumbnailKeyDown}
              aria-label="Image history thumbnails"
              role="toolbar"
            >
              {thumbnailsToShow.map((snap, index) => {
                return (
                  <div
                    key={snap.id}
                    className={`flex-shrink-0 w-20 h-20 border-2 rounded overflow-hidden relative group bg-black cursor-pointer
                                ${focusedThumbnailIndex === index ? 'border-[var(--color-primary-500)] ring-2 ring-[var(--color-primary-500)]' : 'border-[var(--color-border-strong)] hover:border-[var(--color-accent-400)]'}`}
                    onClick={() => handleThumbnailClick(snap.id)}
                    role="button"
                    aria-label={`Select snapshot: ${snap.prompt}`}
                    tabIndex={-1} 
                  >
                    <img
                      src={snap.url}
                      alt={snap.prompt}
                      title={snap.prompt}
                      className="w-full h-full object-cover transition-transform duration-200 ease-in-out group-hover:scale-110"
                    />
                  </div>
                );
                })}
            </div>
          </div>
        )}
      </div>
      {selectedSnapshotForModal && snapshots && (
        <ImageModal
          snapshot={selectedSnapshotForModal}
          allSnapshots={snapshots}
          currentIndex={modalImageIndex}
          onClose={closeModal}
          onNavigate={navigateModal}
        />
      )}
    </>
  );
};

export default ImageSnapshotDisplay;
