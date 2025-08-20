
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  MatrixSettings, AppMode, InterventionTarget, ThemeName, ControlsPanelProps
} from '../types';
import {
  AI1_NAME, AI2_NAME, MIN_TYPING_SPEED_MS, MAX_TYPING_SPEED_MS,
  THEMES, AVAILABLE_MODELS, IMAGEN_MODEL_NAME
} from '../constants';
import RotatingGlobe from './RotatingGlobe';
import LyriaModal from './LyriaModal'; 
import LyriaSaveLoadModal from './LyriaSaveLoadModal';

const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'success'; fullWidth?: boolean }> = ({ children, className, variant = 'primary', fullWidth = false, ...props }) => {
  const baseStyle = "px-3 py-2 border-2 rounded-sm focus:outline-none focus-ring-primary transition-all duration-150 ease-in-out uppercase text-xs tracking-wider font-semibold";
  let variantStyle = "";
  switch(variant) {
    case 'primary':
      variantStyle = "bg-[var(--color-bg-button-primary)] border-[var(--color-border-button-primary)] hover:bg-[var(--color-bg-button-primary-hover)] text-[var(--color-text-button-primary)] hover:shadow-lg hover:shadow-[var(--color-shadow-base)]/50";
      break;
    case 'secondary':
      variantStyle = "bg-[var(--color-bg-button-secondary)] border-[var(--color-border-button-secondary)] hover:bg-[var(--color-bg-button-secondary-hover)] text-[var(--color-text-button-secondary)] hover:shadow-md hover:shadow-[var(--color-shadow-base)]/30";
      break;
    case 'danger':
      variantStyle = "bg-red-600 border-red-700 hover:bg-red-700 text-white hover:shadow-lg hover:shadow-red-500/50";
      break;
    case 'success':
       variantStyle = "bg-green-600 border-green-700 hover:bg-green-700 text-white hover:shadow-lg hover:shadow-green-500/50";
      break;
  }
  const widthStyle = fullWidth ? "w-full" : "";

  return (
    <button className={`${baseStyle} ${variantStyle} ${widthStyle} ${className}`} {...props}>
      {children}
    </button>
  );
};


const ControlsPanel: React.FC<ControlsPanelProps> = ({
  matrixSettings,
  onMatrixSettingsChange,
  onCopyChat,
  onExportTXT,
  onExportMD,
  onBackupChat,
  onLoadChat,
  activeApiKeySource,
  initialCustomKeyValue,
  apiKeyMissingError,
  isEmergencyStopActive,
  onEmergencyStopToggle,
  onSaveCustomApiKey,
  onClearCustomApiKey,
  globalSelectedModelId,
  onGlobalModelChange,
  currentMode,
  onModeChange,
  activeTheme,
  onThemeChange,
  onOpenInfoModal,
  onSendUserIntervention,
  currentTypingSpeed,
  onTypingSpeedChange,
  onCompleteCurrentMessage,
  isAIsTyping,
  activeAIName,
  // Lyria props from App.tsx
  lyriaPrompts,
  lyriaConfig,
  lyriaPlaybackState,
  lyriaStatusMessage,
  isLyriaModalOpen,
  onToggleLyriaModal,
  isLyriaSaveLoadModalOpen,
  onToggleLyriaSaveLoadModal,
  onAddLyriaPrompt,
  onRemoveLyriaPrompt,
  onLyriaPromptTextChange,
  onLyriaPromptWeightChange,
  onLyriaConfigChange,
  onLyriaPlayPause,
  onLyriaResetContext,
  isLyriaReady,
  onSaveLyriaSettings,
  onLoadLyriaSettings,
}) => {
  const [showInterventionInput, setShowInterventionInput] = useState(false);
  const [interventionText, setInterventionText] = useState("");
  const [interventionTarget, setInterventionTarget] = useState<InterventionTarget>('CHAT_FLOW');
  const [showApiKeyManagement, setShowApiKeyManagement] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [customApiKeyInput, setCustomApiKeyInput] = useState('');

  useEffect(() => {
    setCustomApiKeyInput(initialCustomKeyValue);
  }, [initialCustomKeyValue]);

  const enabledAppModes = Object.values(AppMode);

  const handleLoadFileClick = () => fileInputRef.current?.click();
  const getApiKeyStatusMessage = () => {
    if (apiKeyMissingError) return { text: "API Key Missing!", color: "text-[var(--color-error)]" };
    switch (activeApiKeySource) {
      case 'custom': return { text: "Custom Key Active", color: "text-[var(--color-system-message)]" };
      case 'environment': return { text: "Env Key Active", color: "text-[var(--color-info)]" };
      default: return { text: "No Key Set", color: "text-[var(--color-error)]" };
    }
  };
  const apiKeyStatus = getApiKeyStatusMessage();

  return (
    <aside className="w-full md:w-1/3 lg:max-w-xs bg-[var(--color-bg-panel)] border-2 border-[var(--color-border-base)] shadow-xl shadow-[var(--color-shadow-base)]/50 p-3 flex flex-col space-y-3 overflow-y-auto log-display">
      <div className="flex-shrink-0">
        <RotatingGlobe />
      </div>

      <div className="control-group space-y-1">
        <label htmlFor="modeSelect" className="text-xs font-medium text-[var(--color-text-heading)]">Current Mode:</label>
        <select
          id="modeSelect"
          value={currentMode}
          onChange={(e) => onModeChange(e.target.value as AppMode)}
          className="w-full bg-[var(--color-bg-dropdown)] border border-[var(--color-border-input)] text-[var(--color-text-base)] p-2 rounded-sm focus-ring-accent text-sm"
        >
          {enabledAppModes.map(mode => (
            <option key={mode} value={mode}>{mode}</option>
          ))}
        </select>
      </div>

      <Button onClick={onOpenInfoModal} variant="secondary" fullWidth className="text-xs !py-1.5">Mode Info</Button>
      <Button
        onClick={onEmergencyStopToggle}
        variant={isEmergencyStopActive ? 'success' : 'danger'}
        fullWidth
        className="font-bold text-sm !py-2.5"
      >
        {isEmergencyStopActive ? 'RESUME AI' : 'STOP AI'}
      </Button>

       {currentMode !== AppMode.UNIVERSE_SIM_EXE &&
        currentMode !== AppMode.CHESS_SIM_EXE &&
        currentMode !== AppMode.NOOSPHERIC_CONQUEST_EXE &&
        currentMode !== AppMode.STORY_WEAVER_EXE &&
        currentMode !== AppMode.CHIMERA_EXE && (
        <div className="control-group space-y-1">
          <Button onClick={() => setShowInterventionInput(!showInterventionInput)} variant="secondary" fullWidth>
            User Intervention
          </Button>
          {showInterventionInput && (
            <div className="p-2 border border-[var(--color-border-input)] rounded-sm bg-[var(--color-bg-input)] space-y-1">
              <textarea
                value={interventionText}
                onChange={(e) => setInterventionText(e.target.value)}
                rows={3}
                className="w-full bg-[var(--color-bg-input)] border border-[var(--color-border-input)] text-[var(--color-text-base)] p-1.5 rounded-sm focus-ring-accent text-xs placeholder-[var(--color-text-placeholder)]"
                placeholder="Type your intervention..."
              />
              <select
                value={interventionTarget}
                onChange={(e) => setInterventionTarget(e.target.value as InterventionTarget)}
                className="w-full bg-[var(--color-bg-dropdown)] border border-[var(--color-border-input)] text-[var(--color-text-base)] p-1.5 rounded-sm focus-ring-accent text-xs"
              >
                <option value="CHAT_FLOW">Inject into Chat Flow</option>
                <option value="AI1">Send to {AI1_NAME} (Next Turn)</option>
                <option value="AI2">Send to {AI2_NAME} (Next Turn)</option>
              </select>
              <Button onClick={() => { if (interventionText.trim()) { onSendUserIntervention(interventionText, interventionTarget); setInterventionText(""); setShowInterventionInput(false);}}} variant="primary" fullWidth className="text-xs">Send</Button>
            </div>
          )}
        </div>
      )}

       {onGlobalModelChange && (
         <div className="control-group space-y-1">
          <label htmlFor="globalModelSelect" className="text-xs font-medium text-[var(--color-text-heading)]">Global AI Model:</label>
          <select
            id="globalModelSelect"
            value={globalSelectedModelId || ''}
            onChange={(e) => onGlobalModelChange(e.target.value)}
            className="w-full bg-[var(--color-bg-dropdown)] border border-[var(--color-border-input)] text-[var(--color-text-base)] p-2 rounded-sm focus-ring-accent text-sm"
            aria-label="Select global AI model"
          >
            {AVAILABLE_MODELS.filter(m => m.id !== IMAGEN_MODEL_NAME).map(model => (
              <option key={model.id} value={model.id}>{model.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="control-group space-y-1">
        <Button onClick={() => setShowApiKeyManagement(!showApiKeyManagement)} variant="secondary" fullWidth>
          API Key Management
        </Button>
        {showApiKeyManagement && (
          <div className="p-2 border border-[var(--color-border-input)] rounded-sm bg-[var(--color-bg-input)] space-y-1.5">
            <label htmlFor="customApiKeyInput" className="text-xs text-[var(--color-text-muted)]">Custom Gemini API Key:</label>
            <input
              type="password"
              id="customApiKeyInput"
              value={customApiKeyInput}
              onChange={(e) => setCustomApiKeyInput(e.target.value)}
              className="w-full bg-[var(--color-bg-input)] border border-[var(--color-border-input)] text-[var(--color-text-base)] p-1.5 rounded-sm focus-ring-accent text-xs"
              placeholder="Enter custom API Key..."
            />
            <div className="grid grid-cols-2 gap-1">
              <Button onClick={() => onSaveCustomApiKey(customApiKeyInput)} variant="success" className="text-xs !py-1">Save Key</Button>
              <Button onClick={() => { onClearCustomApiKey(); setCustomApiKeyInput(""); }} variant="danger" className="text-xs !py-1">Clear Key</Button>
            </div>
            <p className={`text-center text-xs mt-1 ${apiKeyStatus.color} font-semibold`}>Status: {apiKeyStatus.text}</p>
            {apiKeyMissingError && <p className="text-center text-xs text-[var(--color-error)]">(Check env or enter custom key)</p>}
          </div>
        )}
      </div>

      <div className="control-group space-y-1">
        <div className="flex items-center justify-between gap-2">
          <Button onClick={() => onToggleLyriaModal(true)} variant="secondary" className="flex-grow">
            Lyria Music Controls
          </Button>
          <button
            onClick={onLyriaPlayPause} 
            disabled={!isLyriaReady || isEmergencyStopActive || (lyriaPlaybackState === 'error')}
            className="p-2 bg-[var(--color-bg-button-primary)] rounded-full hover:bg-[var(--color-bg-button-primary-hover)] disabled:opacity-50 flex-shrink-0"
            title={lyriaPlaybackState === 'playing' || lyriaPlaybackState === 'loading' ? "Pause Music" : "Play Music"}
          >
            {lyriaPlaybackState === 'loading' ? (
                <svg className="w-5 h-5 text-[var(--color-text-button-primary)] animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            ) : lyriaPlaybackState === 'playing' ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-[var(--color-text-button-primary)]">
                  <path d="M5.75 3a.75.75 0 0 0-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 0 0 .75-.75V3.75A.75.75 0 0 0 7.25 3h-1.5ZM12.75 3a.75.75 0 0 0-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 0 0 .75-.75V3.75a.75.75 0 0 0-.75-.75h-1.5Z" />
                </svg>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-[var(--color-text-button-primary)]"><path d="M6.3 2.841A1.5 1.5 0 0 0 4 4.11V15.89a1.5 1.5 0 0 0 2.3 1.269l9.344-5.89a1.5 1.5 0 0 0 0-2.538L6.3 2.84Z" /></svg>
            )}
          </button>
        </div>
      </div>
      
      {isLyriaModalOpen && (
        <LyriaModal
          isOpen={isLyriaModalOpen}
          onClose={() => onToggleLyriaModal(false)}
          prompts={lyriaPrompts}
          config={lyriaConfig}
          onAddPrompt={onAddLyriaPrompt}
          onRemovePrompt={onRemoveLyriaPrompt}
          onPromptTextChange={onLyriaPromptTextChange}
          onPromptWeightChange={onLyriaPromptWeightChange}
          onConfigChange={onLyriaConfigChange}
          statusMessage={lyriaStatusMessage}
          onPlayPauseClick={onLyriaPlayPause} 
          currentPlaybackState={lyriaPlaybackState} 
          isLyriaReady={isLyriaReady}
          onOpenSaveLoadModal={() => onToggleLyriaSaveLoadModal(true)}
        />
      )}
      {isLyriaSaveLoadModalOpen && (
        <LyriaSaveLoadModal
          isOpen={isLyriaSaveLoadModalOpen}
          onClose={() => onToggleLyriaSaveLoadModal(false)}
          onSave={onSaveLyriaSettings}
          onLoad={onLoadLyriaSettings}
        />
      )}

      <div className="control-group">
        <label htmlFor="typingSpeed" className="text-xs font-medium text-[var(--color-text-muted)]">AI Typing Speed (ms): {currentTypingSpeed}</label>
        <input 
          type="range" 
          id="typingSpeed" 
          min={MIN_TYPING_SPEED_MS} 
          max={MAX_TYPING_SPEED_MS} 
          value={currentTypingSpeed} 
          onChange={(e) => onTypingSpeedChange(parseInt(e.target.value))}
          className="w-full h-1.5 accent-[var(--color-primary-500)] cursor-pointer"
        />
      </div>

      <div className="control-group space-y-1">
        <h4 className="text-xs font-medium text-[var(--color-text-heading)]">Display & Effects:</h4>
        <div className="grid grid-cols-2 gap-1">
            <select
                id="themeSelect"
                value={activeTheme}
                onChange={(e) => onThemeChange(e.target.value as ThemeName)}
                className="w-full bg-[var(--color-bg-dropdown)] border border-[var(--color-border-input)] text-[var(--color-text-base)] p-1.5 rounded-sm text-xs focus-ring-accent"
                aria-label="Select theme"
            >
                {Object.keys(THEMES).map(themeKey => (
                    <option key={themeKey} value={themeKey}>
                        {themeKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </option>
                ))}
            </select>
           <Button onClick={() => onMatrixSettingsChange('glitchEffect', !matrixSettings.glitchEffect)} variant="secondary" className="text-xs !py-1.5">
            Glitch: {matrixSettings.glitchEffect ? 'ON' : 'OFF'}
          </Button>
          <Button onClick={() => onMatrixSettingsChange('isPaused', !matrixSettings.isPaused)} variant="secondary" className="text-xs !py-1.5">
            Matrix: {matrixSettings.isPaused ? 'Paused' : 'Active'}
          </Button>
        </div>
      </div>

      <div className="control-group grid grid-cols-2 gap-1">
        <Button onClick={onCopyChat} variant="secondary">Copy Chat</Button>
        <div className="relative group">
            <Button variant="secondary" fullWidth className="peer">Export As...</Button>
            <div className="absolute bottom-full mb-1 w-full bg-[var(--color-bg-dropdown)] border border-[var(--color-border-strong)] rounded-sm shadow-lg opacity-0 group-hover:opacity-100 peer-focus-within:opacity-100 transition-opacity duration-150 ease-in-out z-10">
                <Button onClick={onExportTXT} variant="secondary" fullWidth className="!rounded-b-none !border-b-0 hover:!bg-[var(--color-bg-button-secondary-hover)]">TXT</Button>
                <Button onClick={onExportMD} variant="secondary" fullWidth className="!rounded-t-none hover:!bg-[var(--color-bg-button-secondary-hover)]">Markdown</Button>
            </div>
        </div>
      </div>

      <div className="control-group grid grid-cols-2 gap-1">
        <Button onClick={onBackupChat} variant="secondary">Save Session</Button>
        <Button onClick={handleLoadFileClick} variant="secondary">Load Session</Button>
        <input type="file" ref={fileInputRef} onChange={onLoadChat} className="hidden" accept=".json" />
      </div>
      
      {isAIsTyping && (
        <Button onClick={onCompleteCurrentMessage} variant="primary" fullWidth className="mt-auto">
          Complete: {activeAIName}
        </Button>
      )}
    </aside>
  );
};

export default ControlsPanel;
