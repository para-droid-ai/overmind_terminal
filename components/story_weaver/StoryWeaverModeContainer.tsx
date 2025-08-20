
import React, { useState } from 'react';
import { ChatMessage, ImageSnapshot, SenderName, AppMode, StoryWeaverModeContainerProps, StorySeed, StoryOption } from '../../types'; 
import { GoogleGenAI } from '@google/genai'; 
import TerminalWindow from '../TerminalWindow';
import ImageSnapshotDisplay from './ImageSnapshotDisplay';
import StoryWeaverSaveLoadModal from './StoryWeaverSaveLoadModal'; // New Modal
import { SYSTEM_SENDER_NAME, STORY_WEAVER_SENDER_NAME, FACILITATOR_SENDER_NAME } from '../../constants';

const IMAGE_GEN_COMMAND_REGEX = /\[GENERATE_IMAGE:\s*([^\]]+)\]/im;

const StoryWeaverModeContainer: React.FC<StoryWeaverModeContainerProps> = (props) => {
  const {
    genAI,
    messages,
    isLoadingAI, 
    activeTypingMessageId,
    storyWeaverTurnCount,
    snapshots,
    isGeneratingImage,
    appInitializationError,
    appIsLoadingAi, 
    appLoadingAiName,
    storySeeds,
    selectedStorySeed,
    isAwaitingSeedChoice,
    onSelectStorySeed,
    storyContinuationOptions,
    isAwaitingStoryContinuationChoice,
    onSelectStoryContinuation,
    onSaveStoryWeaver,
    onLoadStoryWeaver,
    onRequestNewStoryImage,
  } = props;

  const [isSaveLoadModalOpen, setIsSaveLoadModalOpen] = useState(false);

  const cleanMessagesForDisplay = messages.map(msg => ({
    ...msg,
    text: msg.text.replace(IMAGE_GEN_COMMAND_REGEX, '').trim(),
  })).filter(m => m.text.length > 0 || m.sender === STORY_WEAVER_SENDER_NAME || m.sender === SYSTEM_SENDER_NAME || m.sender === FACILITATOR_SENDER_NAME); 

  let terminalMessages = cleanMessagesForDisplay;
  let terminalIsActuallyLoading = isLoadingAI || isGeneratingImage; 

  if (!genAI && !appInitializationError && !isAwaitingSeedChoice) {
    terminalMessages = [{
      id: 'sw-init-message',
      sender: SYSTEM_SENDER_NAME,
      text: "Story Weaver AI initializing...",
      timestamp: new Date().toISOString(),
      color: 'text-[var(--color-system-message)]',
      isUser: false,
    }, ...cleanMessagesForDisplay];
    terminalIsActuallyLoading = true;
  } else if (appInitializationError && !isAwaitingSeedChoice) {
     terminalMessages = [{
      id: 'sw-error-message',
      sender: SYSTEM_SENDER_NAME,
      text: `Story Weaver AI Error: ${appInitializationError}`,
      timestamp: new Date().toISOString(),
      color: 'text-[var(--color-error)]',
      isUser: false,
    }, ...cleanMessagesForDisplay];
    terminalIsActuallyLoading = true;
  }

  const terminalTitleBase = "STORY WEAVER";
  const seedTitlePart = selectedStorySeed ? ` (${selectedStorySeed.title.substring(0,15)}${selectedStorySeed.title.length > 15 ? '...' : ''})` : '';
  const turnCountPart = ` (Path: ${storyWeaverTurnCount})`;
  
  let dynamicTitlePart = seedTitlePart;
  if (isAwaitingStoryContinuationChoice) {
    dynamicTitlePart = " - CHOOSE YOUR PATH";
  } else if (!isAwaitingSeedChoice) {
    dynamicTitlePart += turnCountPart;
  }

  const terminalTitle = isAwaitingSeedChoice 
    ? `${terminalTitleBase} - CHOOSE YOUR SEED` 
    : `${terminalTitleBase}${dynamicTitlePart}`;

  const storyWeaverHeaderActions = (
    <button
      onClick={() => setIsSaveLoadModalOpen(true)}
      className="p-1 rounded-full hover:bg-[var(--color-bg-button-secondary-hover)] focus-ring-accent text-[var(--color-accent-200)]"
      aria-label="Save or Load Story"
      title="Save/Load Story"
    >
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 15.75V7.5a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 7.5v8.25M15 11.25a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    </button>
  );


  if (isAwaitingSeedChoice) {
    return (
      <div className="flex flex-col h-full w-full bg-[var(--color-bg-terminal)] border-2 border-[var(--color-border-base)] rounded-lg shadow-lg">
        <header className="window-header bg-[var(--color-primary-600)] bg-opacity-60 text-[var(--color-text-heading)] p-3 border-b-2 border-[var(--color-border-base)] flex justify-between items-center">
          <h2 className="text-xl font-bold text-[var(--color-text-heading)] tracking-wider uppercase">{terminalTitle}</h2>
          <div className="story-weaver-header-actions">
            {storyWeaverHeaderActions}
          </div>
        </header>
        <div className="flex flex-col items-center justify-center flex-grow p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
            {storySeeds.map((seed) => (
              <button
                key={seed.id}
                onClick={() => onSelectStorySeed(seed)}
                className="bg-[var(--color-bg-panel)] border-2 border-[var(--color-border-strong)] rounded-lg p-6 text-left hover:bg-[var(--color-bg-input)] hover:shadow-[var(--color-shadow-base)]/50 focus:outline-none focus-ring-primary transition-all duration-150 ease-in-out animate-breathing-border hover:animate-none"
                aria-label={`Select story seed: ${seed.title}`}
              >
                <h3 className="text-lg font-semibold text-[var(--color-primary-500)] mb-2">{seed.title}</h3>
                <p className="text-sm text-[var(--color-text-muted)]">{seed.description}</p>
              </button>
            ))}
          </div>
          {(!storySeeds || storySeeds.length === 0) && !appInitializationError && (
            <p className="text-md text-[var(--color-text-muted)] mt-4">Generating story seeds...</p>
          )}
          {appInitializationError && (
              <p className="text-md text-[var(--color-error)] mt-4">Error: Could not initialize AI. {appInitializationError}</p>
          )}
        </div>
        {isSaveLoadModalOpen && (
          <StoryWeaverSaveLoadModal
            isOpen={isSaveLoadModalOpen}
            onClose={() => setIsSaveLoadModalOpen(false)}
            onSave={onSaveStoryWeaver}
            onLoad={onLoadStoryWeaver}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-full w-full gap-4 p-4">
      <div className="w-full md:w-2/3 h-full flex flex-col">
        <TerminalWindow
          title={terminalTitle}
          messages={terminalMessages}
          isTypingActive={isLoadingAI && activeTypingMessageId !== null}
          activeTypingMessageId={activeTypingMessageId}
          onTypingComplete={props.onTypingComplete}
          typingSpeed={props.typingSpeed}
          isPromptingUser={false} 
          currentMode={AppMode.STORY_WEAVER_EXE}
          commandHistory={[]} 
          onCommandHistoryNavigation={() => {}} 
          className="flex-grow min-h-0"
          isAppAiProcessing={appIsLoadingAi || terminalIsActuallyLoading} 
          appProcessingAiName={appLoadingAiName || (isGeneratingImage ? "Image System" : (isLoadingAI ? "Story Weaver" : null))}
          storyWeaverHeaderContent={storyWeaverHeaderActions}
        />
        {isAwaitingStoryContinuationChoice && (
          <div className="flex-shrink-0 p-3 border-t-2 border-[var(--color-border-strong)] bg-[var(--color-bg-terminal)]">
            <h3 className="text-md font-semibold text-[var(--color-text-heading)] mb-2">Choose a path to continue:</h3>
            {storyContinuationOptions.length > 0 ? (
              <div className="grid grid-cols-1 gap-2">
                {storyContinuationOptions.map((option: StoryOption) => (
                  <button
                    key={option.id}
                    onClick={() => onSelectStoryContinuation(option)}
                    className="w-full text-left p-2.5 text-sm bg-[var(--color-bg-button-secondary)] hover:bg-[var(--color-bg-button-secondary-hover)] text-[var(--color-text-button-secondary)] border border-[var(--color-border-button-secondary)] rounded focus-ring-accent transition-colors"
                    aria-label={`Choose option: ${option.text}`}
                  >
                    {option.text}
                  </button>
                ))}
              </div>
            ) : isLoadingAI && appLoadingAiName === "Option Generator" ? (
              <p className="text-center text-sm text-[var(--color-text-muted)] animate-pulse">Generating choices...</p>
            ) : (
              <p className="text-center text-sm text-[var(--color-error)]">
                No continuation choices available. An error might have occurred or the AI did not provide options.
              </p>
            )}
             <button
                onClick={onRequestNewStoryImage}
                className="w-full mt-3 p-2.5 text-sm bg-[var(--color-bg-button-primary)] hover:bg-[var(--color-bg-button-primary-hover)] text-[var(--color-text-button-primary)] border border-[var(--color-border-button-primary)] rounded focus-ring-accent transition-colors"
                aria-label="Visualize latest scene"
                disabled={isGeneratingImage || isLoadingAI}
              >
                Visualize Latest Scene
              </button>
          </div>
        )}
      </div>
      <div className="w-full md:w-1/3 h-full">
        <ImageSnapshotDisplay snapshots={snapshots} isGenerating={isGeneratingImage} />
      </div>
      {isSaveLoadModalOpen && (
        <StoryWeaverSaveLoadModal
          isOpen={isSaveLoadModalOpen}
          onClose={() => setIsSaveLoadModalOpen(false)}
          onSave={onSaveStoryWeaver}
          onLoad={onLoadStoryWeaver}
        />
      )}
    </div>
  );
};

export default StoryWeaverModeContainer;
