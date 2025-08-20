import React, { useRef, useState, useEffect } from 'react';
import { ChimeraGameState, ChimeraMapData, ChimeraMapNode } from '../../types'; 

interface ChimeraSidebarProps {
  gameState: ChimeraGameState | null;
  activeMapData: ChimeraMapData | null; 
  onUpdateAvatarRequest?: () => void;
  isGeneratingAvatar?: boolean;
  onSaveGameRequest?: () => void;
  onLoadGameRequest?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const ChimeraSidebar: React.FC<ChimeraSidebarProps> = ({ 
    gameState, 
    activeMapData, 
    onUpdateAvatarRequest,
    isGeneratingAvatar,
    onSaveGameRequest,
    onLoadGameRequest
}) => {
  const [selectedMainAvatarUrl, setSelectedMainAvatarUrl] = useState<string | undefined>(undefined);
  const loadGameInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    if (gameState?.playerCharacter?.avatarUrl) {
        setSelectedMainAvatarUrl(gameState.playerCharacter.avatarUrl);
    } else {
        setSelectedMainAvatarUrl(undefined); 
    }
  }, [gameState?.playerCharacter?.avatarUrl]);

  const handleLoadClick = () => {
    loadGameInputRef.current?.click();
  };

  const renderContent = () => {
    if (!gameState || !gameState.playerCharacter) {
      return (
        <div className="p-3 text-center text-[var(--color-text-muted)]">
          <p className="animate-pulse">Character creation in progress...</p>
          <p className="text-xs mt-2">Awaiting data stream from DM &amp; Player AI.</p>
           {isGeneratingAvatar && (
            <div className="mt-4">
              <div className="w-10 h-10 mx-auto border-2 border-dashed rounded-full animate-spin border-[var(--color-primary-500)]"></div>
              <p className="text-xs text-[var(--color-system-message)] animate-pulse mt-1">Generating Avatar...</p>
            </div>
          )}
        </div>
      );
    }

    const { playerCharacter, dmNarrative, mode, worldState, isAwaitingPlayerAction, quests } = gameState;
    const currentNodeId = gameState.currentNodeId;
    const displayAvatarUrl = selectedMainAvatarUrl || playerCharacter.avatarUrl;
    const currentMapNode: ChimeraMapNode | undefined = activeMapData?.nodes?.[currentNodeId];
    const currentLocationName = currentMapNode?.name || currentNodeId || "Unknown Location";


    return (
      <>
        {/* Character Info Block & Avatar */}
        <div className="flex flex-row items-start p-2 mb-1">
          {/* Left Column: Character Name & Stats */}
          <div className="flex-grow mr-2">
            <h3 className="text-lg font-bold text-[var(--color-text-heading)]">
              {playerCharacter.name} <span className="text-sm opacity-80">(Lvl {playerCharacter.level})</span>
            </h3>
            <div className="text-xs space-y-0.5 text-[var(--color-text-base)] mt-1">
              <p>HP: <span className="font-semibold text-green-400">{playerCharacter.hp.current}</span> / {playerCharacter.hp.max}</p>
              <p>AC: <span className="font-semibold text-sky-400">{playerCharacter.ac}</span></p>
              <p>XP: {playerCharacter.xp.current} / {playerCharacter.xp.toNext}</p>
              <p>Pos: <span className="font-semibold truncate" title={currentLocationName}>{currentLocationName}</span></p>
              <p>Status: <span className={`font-semibold ${isAwaitingPlayerAction ? 'text-yellow-400 animate-pulse' : 'text-gray-400'}`}>{isAwaitingPlayerAction ? 'Awaiting Action' : 'Processing...'}</span></p>
              <p>Mode: <span className="font-semibold text-cyan-400">{mode}</span></p>
            </div>
          </div>

          {/* Right Column: Avatar & Controls */}
          <div className="flex-shrink-0 w-24 md:w-28 flex flex-col items-center">
            <div className="w-full h-24 md:h-28 relative group mb-1">
              {isGeneratingAvatar && (!selectedMainAvatarUrl || selectedMainAvatarUrl === playerCharacter.avatarUrl) && (
                <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center rounded-md z-10">
                  <div className="w-8 h-8 border-2 border-dashed rounded-full animate-spin border-[var(--color-primary-500)]"></div>
                </div>
              )}
              {displayAvatarUrl && !(isGeneratingAvatar && displayAvatarUrl === playerCharacter.avatarUrl) && (
                <img src={displayAvatarUrl} alt={`${playerCharacter.name} avatar`} className="w-full h-full object-cover rounded-md border-2 border-[var(--color-accent-400)] shadow-md" />
              )}
              {!displayAvatarUrl && !isGeneratingAvatar && (
                <div className="w-full h-full rounded-md border-2 border-[var(--color-border-base)] bg-black flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                   <p className="absolute bottom-1 text-[8px] text-center text-[var(--color-text-muted)]">No Avatar</p>
                </div>
              )}
              {onUpdateAvatarRequest && (
               <button
                  onClick={() => {
                      setSelectedMainAvatarUrl(undefined); 
                      onUpdateAvatarRequest();
                  }}
                  disabled={isGeneratingAvatar}
                  className="absolute -bottom-1 -right-1 p-1 bg-[var(--color-bg-button-primary)] text-[var(--color-text-button-primary)] rounded-full hover:bg-[var(--color-bg-button-primary-hover)] focus-ring-accent opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-md"
                  title="Regenerate Avatar"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                </button>
             )}
            </div>
          
            {playerCharacter.avatarHistory && playerCharacter.avatarHistory.length > 1 && (
              <div className="w-full">
                <div className="flex space-x-1 overflow-x-auto pb-0.5 thumbnail-scrollbar justify-center max-w-full">
                  {playerCharacter.avatarHistory.slice().reverse().map((histUrl, index) => {
                    if (index >= 3) return null; 
                    return (
                    <div
                      key={`avatar-hist-${index}`}
                      className={`flex-shrink-0 w-8 h-8 border rounded overflow-hidden relative group cursor-pointer
                                  ${histUrl === displayAvatarUrl ? 'border-[var(--color-primary-500)]' : 'border-[var(--color-border-strong)] hover:border-[var(--color-accent-400)]'}`}
                      onClick={() => setSelectedMainAvatarUrl(histUrl)}
                    >
                      <img
                        src={histUrl}
                        alt={`Avatar history ${index+1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )})}
                </div>
              </div>
            )}
          </div>
        </div>
        
        <hr className="border-[var(--color-border-strong)] mx-2 my-1" />

        <div className="px-2 mt-2">
          <h4 className="text-md font-semibold text-[var(--color-text-heading)] border-b border-[var(--color-border-strong)] pb-1 mb-1.5">DM Narrative</h4>
          <p className="text-xs text-[var(--color-text-muted)] italic max-h-28 overflow-y-auto pr-1 custom-scrollbar">
            {dmNarrative || "Awaiting DM input..."}
          </p>
        </div>
      
        <div className="my-2 mx-2 border-2 border-dashed border-[var(--color-border-strong)] rounded-md p-3 h-24 flex items-center justify-center text-center text-[var(--color-text-muted)] bg-[var(--color-bg-terminal)] bg-opacity-30">
          <p className="italic text-sm">Visual Snapshot Area <br/><span className="text-xs">(Future Feature)</span></p>
        </div>

        {/* Attributes, Skills, Quests etc. sections */}
        <div className="px-2">
          <h4 className="text-md font-semibold text-[var(--color-text-heading)] border-b border-[var(--color-border-strong)] pb-1 mb-1.5">Attributes</h4>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
            {Object.entries(playerCharacter.stats).map(([stat, value]) => (
              <p key={stat}>{stat}: <span className="font-semibold text-[var(--color-text-base)]">{String(value)} <span className="opacity-70">({Math.floor((Number(value) - 10) / 2) >= 0 ? '+' : ''}{Math.floor((Number(value) - 10) / 2)})</span></span></p>
            ))}
          </div>
        </div>
      
        <div className="px-2 mt-2">
          <h4 className="text-md font-semibold text-[var(--color-text-heading)] border-b border-[var(--color-border-strong)] pb-1 mb-1.5">Skills</h4>
          <div className="text-xs space-y-0.5">
            {Object.entries(playerCharacter.skills).map(([skill, value]) => (
              <p key={skill}>{skill}: <span className="font-semibold text-[var(--color-text-base)]">{String(value)}</span></p>
            ))}
            {Object.keys(playerCharacter.skills).length === 0 && <p className="italic text-[var(--color-text-muted)]">No specialized skills.</p>}
          </div>
        </div>

        {quests && quests.length > 0 && (
          <div className="px-2 mt-2">
            <h4 className="text-md font-semibold text-[var(--color-text-heading)] border-b border-[var(--color-border-strong)] pb-1 mb-1.5">Active Quests</h4>
            <div className="text-xs space-y-1 max-h-24 overflow-y-auto custom-scrollbar pr-1">
              {quests.filter(q => q.status === 'active').map(quest => (
                <div key={quest.id}>
                  <p className="font-semibold text-[var(--color-text-base)]">{quest.title}</p>
                  <p className="italic text-[var(--color-text-muted)] pl-2">{quest.description}</p>
                </div>
              ))}
              {quests.filter(q => q.status === 'active').length === 0 && <p className="italic text-[var(--color-text-muted)]">No active quests.</p>}
            </div>
          </div>
        )}

        {worldState && Object.keys(worldState).length > 0 && (
          <div className="px-2 mt-2">
            <h4 className="text-md font-semibold text-[var(--color-text-heading)] border-b border-[var(--color-border-strong)] pb-1 mb-1.5">World State</h4>
            <div className="text-xs space-y-0.5 max-h-20 overflow-y-auto pr-1 custom-scrollbar">
              {Object.entries(worldState).map(([key, value]) => (
                <p key={key} className="text-[var(--color-text-muted)]">{key}: <span className="font-semibold text-[var(--color-text-base)]">{String(value)}</span></p>
              ))}
            </div>
          </div>
        )}
        
        {/* Save/Load Buttons Area */}
        <div className="mt-auto pt-2 border-t border-[var(--color-border-strong)] px-2 space-y-2">
          {onSaveGameRequest && (
            <button 
              onClick={onSaveGameRequest} 
              className="w-full px-3 py-1.5 bg-[var(--color-bg-button-secondary)] text-[var(--color-text-button-secondary)] rounded hover:bg-[var(--color-bg-button-secondary-hover)] focus-ring-accent text-xs font-semibold uppercase tracking-wider"
            >
              Save Chimera State
            </button>
          )}
          {onLoadGameRequest && (
            <>
              <button 
                onClick={handleLoadClick} 
                className="w-full px-3 py-1.5 bg-[var(--color-bg-button-secondary)] text-[var(--color-text-button-secondary)] rounded hover:bg-[var(--color-bg-button-secondary-hover)] focus-ring-accent text-xs font-semibold uppercase tracking-wider"
              >
                Load Chimera State
              </button>
              <input 
                type="file" 
                ref={loadGameInputRef} 
                onChange={onLoadGameRequest} 
                className="hidden" 
                accept=".json" 
                aria-label="Load Chimera game state file"
              />
            </>
          )}
          <p className="text-xs text-center text-[var(--color-text-muted)] mt-1">Chimera v0.6 Interface</p>
        </div>
      </>
    );
  };

  return (
    <div className="w-full h-full p-1 space-y-1 overflow-y-auto bg-[var(--color-bg-panel)] border-2 border-[var(--color-border-base)] rounded-md log-display custom-scrollbar">
      {renderContent()}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0,0,0,0.2);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: var(--color-scrollbar-thumb-hover);
          border-radius: 3px;
        }
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: var(--color-scrollbar-thumb-hover) rgba(0,0,0,0.2);
        }
        .thumbnail-scrollbar::-webkit-scrollbar {
          height: 4px; 
        }
        .thumbnail-scrollbar::-webkit-scrollbar-thumb {
          background: var(--color-scrollbar-thumb); 
          border-radius: 2px;
        }
        .thumbnail-scrollbar::-webkit-scrollbar-track {
          background: rgba(0,0,0,0.1); 
        }
        .thumbnail-scrollbar {
            scrollbar-width: thin;
            scrollbar-color: var(--color-scrollbar-thumb) rgba(0,0,0,0.1);
        }
      `}</style>
    </div>
  );
};

export default ChimeraSidebar;