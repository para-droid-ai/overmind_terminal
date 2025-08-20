
import React, { useState } from 'react';
import { LyriaPrompt, LiveMusicGenerationConfig, LyriaPlaybackState } from '../types';
import WeightSlider from './WeightSlider'; 
import { MAX_LYRIA_PROMPTS, LYRIA_PROMPT_COLORS } from '../constants'; // Updated import path


interface LyriaModalProps {
  isOpen: boolean;
  onClose: () => void;
  prompts: LyriaPrompt[];
  config: LiveMusicGenerationConfig;
  onAddPrompt: () => void;
  onRemovePrompt: (id: string) => void;
  onPromptTextChange: (id: string, text: string) => void;
  onPromptWeightChange: (id: string, weight: number) => void;
  onConfigChange: (key: keyof LiveMusicGenerationConfig, value: any) => void;
  // maxPrompts and promptColors are now directly imported from constants if needed, or not used if App.tsx passes them
  statusMessage: string;
  onPlayPauseClick: () => void; 
  currentPlaybackState: LyriaPlaybackState; 
  isLyriaReady: boolean; 
  onOpenSaveLoadModal: () => void;
}

const LyriaModal: React.FC<LyriaModalProps> = ({
  isOpen,
  onClose,
  prompts,
  config,
  onAddPrompt,
  onRemovePrompt,
  onPromptTextChange,
  onPromptWeightChange,
  onConfigChange,
  statusMessage,
  onPlayPauseClick,
  currentPlaybackState,
  isLyriaReady,
  onOpenSaveLoadModal,
}) => {
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-[var(--color-bg-terminal)] bg-opacity-80 flex items-center justify-center z-50 p-4"
      onClick={onClose} // Close on overlay click
      role="dialog"
      aria-modal="true"
      aria-labelledby="lyria-modal-title"
    >
      <div
        className="bg-[var(--color-bg-panel)] border-2 border-[var(--color-border-base)] shadow-xl shadow-[var(--color-shadow-base)]/50 rounded-lg p-4 max-w-lg w-full max-h-[90vh] flex flex-col text-[var(--color-text-base)]" // Increased max-w-lg
        onClick={(e) => e.stopPropagation()} // Prevent click inside from closing modal
      >
        <div className="flex justify-between items-center mb-3 flex-shrink-0">
          <h2 id="lyria-modal-title" className="text-lg font-bold text-[var(--color-text-heading)]">Lyria Music Engine</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={onOpenSaveLoadModal}
              className="p-1.5 rounded-full hover:bg-[var(--color-bg-button-secondary-hover)] focus-ring-accent text-[var(--color-accent-200)]"
              aria-label="Save or Load Lyria Settings"
              title="Save/Load Lyria Settings"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 15.75V7.5a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 7.5v8.25M15 11.25a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <button 
              onClick={onClose} 
              className="text-[var(--color-text-muted)] hover:text-[var(--color-text-heading)] focus-ring-accent p-1 rounded-full"
              aria-label="Close Lyria Controls"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-grow overflow-y-auto space-y-3 pr-2 log-display">
          {/* Prompts Section */}
          <h5 className="text-sm font-semibold text-[var(--color-text-heading)] border-b border-[var(--color-border-strong)] pb-1">Music Prompts</h5>
          <div className="space-y-1.5 max-h-[30rem] overflow-y-auto pr-1 log-display"> {/* Increased max-h to 30rem */}
            {prompts.map((prompt, index) => (
              <div key={prompt.promptId} className="flex items-center gap-1.5 p-1.5 border border-[var(--color-border-input)] rounded-sm bg-black bg-opacity-20">
                <label id={`lyria-prompt-label-${prompt.promptId}`} className="sr-only">Weight for prompt {index + 1}</label>
                <WeightSlider
                  value={prompt.weight}
                  color={prompt.color}
                  onInput={(newWeight) => onPromptWeightChange(prompt.promptId, newWeight)}
                  className="w-14 h-auto self-stretch" 
                  promptId={prompt.promptId}
                />
                <input
                  type="text"
                  value={prompt.text}
                  onChange={(e) => onPromptTextChange(prompt.promptId, e.target.value)}
                  className="flex-grow bg-transparent border border-[var(--color-border-input)] text-[var(--color-text-base)] p-1 rounded-sm text-xs placeholder-[var(--color-text-placeholder)] focus-ring-accent"
                  placeholder={`Prompt ${index + 1}...`}
                  aria-label={`Text for prompt ${index + 1}`}
                />
                <button
                  onClick={() => onRemovePrompt(prompt.promptId)}
                  className="p-1 bg-red-700 text-white rounded hover:bg-red-600 text-xs aspect-square self-start"
                  title="Remove prompt"
                  aria-label={`Remove prompt ${index + 1}`}
                >✕</button>
              </div>
            ))}
          </div>
          {prompts.length < MAX_LYRIA_PROMPTS && (
            <button 
              onClick={onAddPrompt} 
              className="w-full text-xs py-1.5 px-3 bg-[var(--color-bg-button-secondary)] text-[var(--color-text-button-secondary)] rounded hover:bg-[var(--color-bg-button-secondary-hover)] focus-ring-accent"
            >
              Add Music Prompt (Max: {MAX_LYRIA_PROMPTS})
            </button>
          )}

          {/* Advanced Settings Section */}
          <div className="mt-2">
            <button 
              onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
              className="w-full text-xs py-1.5 px-3 bg-[var(--color-bg-button-secondary)] text-[var(--color-text-button-secondary)] rounded hover:bg-[var(--color-bg-button-secondary-hover)] focus-ring-accent mb-1"
              aria-expanded={showAdvancedSettings}
            >
              {showAdvancedSettings ? 'Hide':'Show'} Advanced Settings
            </button>
            {showAdvancedSettings && (
              <div className="p-1.5 border-t border-[var(--color-border-strong)] space-y-1.5 text-xs">
                <div><label htmlFor="lyria-temp">Temp: {config.temperature?.toFixed(1)}</label><input id="lyria-temp" type="range" min="0" max="3" step="0.1" value={config.temperature ?? 1.1} onChange={e => onConfigChange('temperature', e.target.value)} className="w-full accent-[var(--color-primary-500)] h-1.5"/></div>
                <div><label htmlFor="lyria-guidance">Guidance: {config.guidance?.toFixed(1)}</label><input id="lyria-guidance" type="range" min="0" max="6" step="0.1" value={config.guidance ?? 4.0} onChange={e => onConfigChange('guidance', e.target.value)} className="w-full accent-[var(--color-primary-500)] h-1.5"/></div>
                <div><label htmlFor="lyria-topk">Top K: {config.topK}</label><input id="lyria-topk" type="range" min="1" max="100" step="1" value={config.topK ?? 40} onChange={e => onConfigChange('topK', e.target.value)} className="w-full accent-[var(--color-primary-500)] h-1.5"/></div>
                <div><label htmlFor="lyria-seed">Seed (Optional):</label><input id="lyria-seed" type="number" placeholder="Auto" value={config.seed ?? ''} onChange={e => onConfigChange('seed', e.target.value)} className="w-full text-xs p-1 bg-black bg-opacity-20 border border-[var(--color-border-input)] rounded"/></div>
                <div><label htmlFor="lyria-bpm">BPM (Optional):</label><input id="lyria-bpm" type="number" min="60" max="180" placeholder="Auto" value={config.bpm ?? ''} onChange={e => onConfigChange('bpm', e.target.value)} className="w-full text-xs p-1 bg-black bg-opacity-20 border border-[var(--color-border-input)] rounded"/></div>
                <div className="flex items-center justify-between"><label htmlFor="lyria-mutebass">Mute Bass</label><input id="lyria-mutebass" type="checkbox" checked={!!config.muteBass} onChange={e => onConfigChange('muteBass', e.target.checked)} className="accent-[var(--color-primary-500)]"/></div>
                <div className="flex items-center justify-between"><label htmlFor="lyria-mutedrums">Mute Drums</label><input id="lyria-mutedrums" type="checkbox" checked={!!config.muteDrums} onChange={e => onConfigChange('muteDrums', e.target.checked)} className="accent-[var(--color-primary-500)]"/></div>
              </div>
            )}
          </div>
        </div>

        <p className={`text-center text-xs mt-2 flex-shrink-0 ${statusMessage.toLowerCase().includes('error') ? 'text-[var(--color-error)]' : 'text-[var(--color-info)]'}`}>
            Lyria: {statusMessage}
        </p>
        <div className="flex items-center gap-2 mt-3 flex-shrink-0">
            <button
                onClick={onPlayPauseClick}
                disabled={!isLyriaReady || currentPlaybackState === 'error'}
                className="p-2.5 bg-[var(--color-bg-button-primary)] rounded-md hover:bg-[var(--color-bg-button-primary-hover)] disabled:opacity-50 flex-shrink-0"
                title={currentPlaybackState === 'playing' || currentPlaybackState === 'loading' ? "Pause Music" : "Play Music"}
            >
                {currentPlaybackState === 'loading' ? (
                    <svg className="w-5 h-5 text-[var(--color-text-button-primary)] animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                ) : currentPlaybackState === 'playing' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-[var(--color-text-button-primary)]"><path d="M5.75 3a.75.75 0 0 0-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 0 0 .75-.75V3.75A.75.75 0 0 0 7.25 3h-1.5ZM12.75 3a.75.75 0 0 0-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 0 0 .75-.75V3.75a.75.75 0 0 0-.75-.75h-1.5Z" /></svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-[var(--color-text-button-primary)]"><path d="M6.3 2.841A1.5 1.5 0 0 0 4 4.11V15.89a1.5 1.5 0 0 0 2.3 1.269l9.344-5.89a1.5 1.5 0 0 0 0-2.538L6.3 2.84Z" /></svg>
                )}
            </button>
            <button 
                onClick={onClose}
                className="w-full bg-[var(--color-bg-button-primary)] text-[var(--color-text-button-primary)] hover:bg-[var(--color-bg-button-primary-hover)] px-4 py-2 rounded-sm focus-ring-primary text-sm font-semibold uppercase tracking-wider"
            >
                Close Controls
            </button>
        </div>
      </div>
    </div>
  );
};

export default LyriaModal;
