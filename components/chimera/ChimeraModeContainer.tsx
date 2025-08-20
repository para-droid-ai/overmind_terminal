
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Chat, GenerateContentResponse, GoogleGenAI } from '@google/genai';
import { AppMode, ChimeraGameState, ChimeraCharacter, SenderName, ChatMessage, Quest, ChimeraModeContainerProps, ChimeraItem, ChimeraPlayerActionType, ChimeraMapData, InteractableObject, LocationBlueprint, ChimeraMapNode } from '../../types';
import ChimeraSidebar from './ChimeraSidebar';
import ChimeraMapDisplay from './ChimeraMapDisplay';
import { chimeraMaps } from '../../data/chimera-maps'; 
import { chimeraLocationData } from '../../data/chimera-locations'; 
import { characterTemplates } from '../../data/character-data';
import { SYSTEM_SENDER_NAME, CHIMERA_DM_SENDER_NAME, CHIMERA_PLAYER_SENDER_NAME, FACILITATOR_SENDER_NAME, CHIMERA_DM_COLOR, CHIMERA_PLAYER_COLOR, CHIMERA_FACILITATOR_PROMPT_MESSAGE, IMAGEN_MODEL_NAME, CHIMERA_ITEM_DEFINITIONS, AVAILABLE_MODELS } from '../../constants';
import TerminalWindow from '../TerminalWindow';

type DynamicSpawnData = {
  character_id: string;
  grid_pos: string; 
};

const MAX_AUTONOMOUS_TURNS_CHIMERA = 5;

interface CreationStepProgress {
  dmMessageSent: boolean;
  playerMessageSent: boolean;
  avatarGenerated: boolean;
  incitingIncidentSet: boolean;
}

type CreationStep = 'IDLE' | 'AWAITING_ARCHETYPES' | 'AWAITING_PLAYER_CHOICE' | 'GENERATING_AVATAR' | 'AWAITING_INCITING_INCIDENT' | 'CREATION_COMPLETE';

const CREATION_STEPS_FOR_GLOBAL_LOG_SET = new Set<CreationStep>([
  'AWAITING_ARCHETYPES',
  'AWAITING_PLAYER_CHOICE',
  'AWAITING_INCITING_INCIDENT',
  'GENERATING_AVATAR'
]);

const ChimeraModeContainer: React.FC<ChimeraModeContainerProps> = ({
  dmAiChat,
  playerAiChat,
  genAI,
  addMessageToHistory,
  // conversationHistory, // Global conversation history from App.tsx, not directly used by Chimera's terminal
  commandHistory, // Global command history, Chimera uses localCommandHistory
  onCommandHistoryNavigation, // Global handler, Chimera uses local
  typingSpeed,
  onTypingComplete: globalOnTypingComplete, // Global handler
  activeTypingMessageId: globalActiveTypingMessageId, // Global ID
  onSaveGameRequest,
  onLoadGameRequest,
  initialGameState: propInitialGameState,
  isEmergencyStopActive,
  onEmergencyStopToggle,
  currentMode: currentAppMode,
  onModeChange,
  appInitializationError,
  appIsLoadingAi, // Global app loading state from App.tsx
  appLoadingAiName // Global app loading AI name from App.tsx
}) => {
  const [gameState, setGameState] = useState<ChimeraGameState | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState<boolean>(false); // Local loading state for Chimera AIs
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState<boolean>(false);
  const [currentlyProcessingChimeraAiName, setCurrentlyProcessingChimeraAiName] = useState<string | null>(null);
  
  const [activeMapData, setActiveMapData] = useState<ChimeraMapData | null>(null);
  const [currentMapInteractables, setCurrentMapInteractables] = useState<InteractableObject[]>([]);


  const [facilitatorInputValue, setFacilitatorInputValue] = useState("");
  const [chimeraTerminalMessages, setChimeraTerminalMessages] = useState<ChatMessage[]>([]);
  const [currentLocalTypingMessageId, setCurrentLocalTypingMessageId] = useState<string | null>(null);

  const [creationStep, setCreationStep] = useState<CreationStep>(
    propInitialGameState ? 'CREATION_COMPLETE' : 'IDLE' 
  );
  const creationStepProgressRef = useRef<CreationStepProgress>({
    dmMessageSent: false,
    playerMessageSent: false,
    avatarGenerated: false,
    incitingIncidentSet: false,
  });
  const generatedAvatarUrlRef = useRef<string>('/chimeraavatar.jpg'); // Default to fallback


  const chimeraTurnCountRef = useRef(0);
  const [isAwaitingChimeraContinuation, setIsAwaitingChimeraContinuation] = useState(false);
  const [hasProcessedInitialLoad, setHasProcessedInitialLoad] = useState(false);
  const gameLoopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  const [localCommandHistory, setLocalCommandHistory] = useState<string[]>([]);
  const localCommandHistoryIndexRef = useRef<number>(-1);
  const [playerInputBuffer, setPlayerInputBuffer] = useState("");


  const localAddMessageToTerminal = useCallback((sender: SenderName | string, text: string, color?: string, makeActiveTypingHere?: boolean): string => {
    const newMessage: ChatMessage = {
      id: `chimera-msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      sender,
      text,
      timestamp: new Date().toISOString(),
      color: color || (sender === SYSTEM_SENDER_NAME ? 'text-[var(--color-system-message)]' : sender === FACILITATOR_SENDER_NAME ? 'text-[var(--color-facilitator)]' : undefined),
      isUser: sender === "USER_INPUT" 
    };
    setChimeraTerminalMessages(prev => {
      if (prev.some(m => m.text === text && m.sender === sender && (sender === SYSTEM_SENDER_NAME || sender === CHIMERA_DM_SENDER_NAME))) {
        if (makeActiveTypingHere && (sender === CHIMERA_DM_SENDER_NAME || sender === CHIMERA_PLAYER_SENDER_NAME)) {
           const existingMsg = prev.find(m => m.text === text && m.sender === sender);
           if(existingMsg) setCurrentLocalTypingMessageId(existingMsg.id);
        }
        return prev;
      }
      return [...prev, newMessage];
    });
    
    if (makeActiveTypingHere && (sender === CHIMERA_DM_SENDER_NAME || sender === CHIMERA_PLAYER_SENDER_NAME)) {
      setCurrentLocalTypingMessageId(newMessage.id);
      if (sender === CHIMERA_DM_SENDER_NAME) setCurrentlyProcessingChimeraAiName(CHIMERA_DM_SENDER_NAME);
      else if (sender === CHIMERA_PLAYER_SENDER_NAME) setCurrentlyProcessingChimeraAiName(CHIMERA_PLAYER_SENDER_NAME);
    }
    
    if (CREATION_STEPS_FOR_GLOBAL_LOG_SET.has(creationStep as CreationStep) && sender !== FACILITATOR_SENDER_NAME && sender !== SYSTEM_SENDER_NAME) {
        addMessageToHistory(sender, text, color, false, makeActiveTypingHere);
    } else if (sender === SYSTEM_SENDER_NAME && text.includes("Chimera Protocol Initialized")) {
        addMessageToHistory(sender, text, color, false, makeActiveTypingHere);
    }
    return newMessage.id;
  }, [addMessageToHistory, creationStep]);


  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (gameLoopTimeoutRef.current) clearTimeout(gameLoopTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const containerElement = document.getElementById('chimera-mode-container-data');
    if (containerElement && gameState) {
      try {
        const stateToSave: ChimeraGameState = { // Ensure type conformity
          ...gameState,
          worldState: {
            ...gameState.worldState,
            chimeraTurnCount: chimeraTurnCountRef.current,
            isAwaitingFacilitator: isAwaitingChimeraContinuation,
          }
        };
        containerElement.dataset.chimeraGameState = JSON.stringify(stateToSave);
      } catch (e) {
        console.error("Error serializing Chimera game state:", e);
      }
    } else if (containerElement && !gameState) {
      delete containerElement.dataset.chimeraGameState;
    }
  }, [gameState, isAwaitingChimeraContinuation]);

  useEffect(() => {
    if (gameState?.currentMapId && (!activeMapData || activeMapData.id !== gameState.currentMapId)) {
        const mapData = chimeraMaps[gameState.currentMapId];
        setActiveMapData(mapData || null);
        
        const currentNode = mapData?.nodes?.[gameState.currentNodeId];
        if (currentNode?.interactableObjectIds) {
            const interactableIdsForNode = currentNode.interactableObjectIds;
            const allInteractables = chimeraLocationData.flatMap(loc => loc.interactables);
            const nodeInteractables = allInteractables.filter(obj => interactableIdsForNode?.includes(obj.id));
            setCurrentMapInteractables(nodeInteractables);
        } else {
            setCurrentMapInteractables([]);
        }
    } else if (gameState?.currentMapId && activeMapData && activeMapData.id === gameState.currentMapId) {
        const currentNode = activeMapData.nodes?.[gameState.currentNodeId];
        if (currentNode?.interactableObjectIds) {
            const interactableIdsForNode = currentNode.interactableObjectIds;
            const allInteractables = chimeraLocationData.flatMap(loc => loc.interactables);
            const nodeInteractables = allInteractables.filter(obj => interactableIdsForNode?.includes(obj.id));
            setCurrentMapInteractables(nodeInteractables);
        } else {
            setCurrentMapInteractables([]);
        }
    }
  }, [gameState?.currentMapId, gameState?.currentNodeId, activeMapData]);
  
  useEffect(() => {
    if (!isMountedRef.current) return;

    if (propInitialGameState && !hasProcessedInitialLoad) {
        setGameState(propInitialGameState);
        setCreationStep('CREATION_COMPLETE'); 
        setIsLoadingAI(false);
        setCurrentlyProcessingChimeraAiName(null);
        chimeraTurnCountRef.current = propInitialGameState.worldState?.chimeraTurnCount || 0;
        setIsAwaitingChimeraContinuation(propInitialGameState.worldState?.isAwaitingFacilitator || false);
        const mapName = chimeraMaps[propInitialGameState.currentMapId]?.name || propInitialGameState.currentMapId;
        const nodeName = chimeraMaps[propInitialGameState.currentMapId]?.nodes?.[propInitialGameState.currentNodeId]?.name || propInitialGameState.currentNodeId;
        localAddMessageToTerminal(SYSTEM_SENDER_NAME, `Chimera session restored. Map: ${mapName}, Node: ${nodeName}. Player Turn: ${propInitialGameState.isAwaitingPlayerAction}.`, 'text-yellow-400');
        setHasProcessedInitialLoad(true);
    } else if (!propInitialGameState && !gameState && creationStep === 'IDLE' && !appInitializationError && dmAiChat && playerAiChat) {
        creationStepProgressRef.current = { dmMessageSent: false, playerMessageSent: false, avatarGenerated: false, incitingIncidentSet: false };
        generatedAvatarUrlRef.current = "/chimeraavatar.jpg"; // Ensure fallback is set at start
        localAddMessageToTerminal(SYSTEM_SENDER_NAME, "Chimera Protocol Initialized. DM is formulating character archetypes.", 'text-green-400', false);
        setCreationStep('AWAITING_ARCHETYPES');
    }
  }, [propInitialGameState, gameState, creationStep, dmAiChat, playerAiChat, localAddMessageToTerminal, hasProcessedInitialLoad, appInitializationError]);

  const handleLocalTypingComplete = useCallback((messageId: string) => {
    if (currentLocalTypingMessageId === messageId) {
        setCurrentLocalTypingMessageId(null);
        setCurrentlyProcessingChimeraAiName(null); // Clear processing name when typing completes
    }
    // If this message was also the global one, notify App.tsx
    if (globalActiveTypingMessageId === messageId && globalOnTypingComplete) {
        globalOnTypingComplete(messageId);
    }
  }, [currentLocalTypingMessageId, globalActiveTypingMessageId, globalOnTypingComplete]);


  const runGameTurn = useCallback(async () => {
    if (isEmergencyStopActive || !isMountedRef.current || (creationStep as CreationStep) !== 'CREATION_COMPLETE' || !gameState || gameState.isAwaitingPlayerAction || isLoadingAI) {
      return;
    }

    setIsLoadingAI(true);
    setCurrentlyProcessingChimeraAiName(CHIMERA_DM_SENDER_NAME);
    const dmMessageId = localAddMessageToTerminal(CHIMERA_DM_SENDER_NAME, `DM narrating (Turn ${chimeraTurnCountRef.current + 1})...`, CHIMERA_DM_COLOR, true);
    
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000)); 
    if (!isMountedRef.current) { setIsLoadingAI(false); setCurrentlyProcessingChimeraAiName(null); return; }

    const newDmNarrative = `The environment shifts subtly. The hum of the machinery in this sector seems louder. What do you do? (Turn ${chimeraTurnCountRef.current + 1} outcome for player's last action).`;
    setChimeraTerminalMessages(prev => prev.map(m => m.id === dmMessageId ? {...m, text: newDmNarrative, id: m.id} : m));
    handleLocalTypingComplete(dmMessageId); // This will also clear currentlyProcessingChimeraAiName

    setGameState(prev => {
      if (!prev) return null;
      return {
        ...prev,
        dmNarrative: newDmNarrative,
        isAwaitingPlayerAction: true, 
      };
    });
    chimeraTurnCountRef.current += 1;
    setIsLoadingAI(false); // Processing done for this specific AI action
    // currentlyProcessingChimeraAiName will be cleared by handleLocalTypingComplete

    if (chimeraTurnCountRef.current >= MAX_AUTONOMOUS_TURNS_CHIMERA && !isAwaitingChimeraContinuation) {
        setIsAwaitingChimeraContinuation(true);
        localAddMessageToTerminal(FACILITATOR_SENDER_NAME, CHIMERA_FACILITATOR_PROMPT_MESSAGE, 'text-[var(--color-facilitator)]');
    }
  }, [isEmergencyStopActive, creationStep, gameState, isLoadingAI, localAddMessageToTerminal, isAwaitingChimeraContinuation, handleLocalTypingComplete]);

  const handlePlayerActionSubmit = async () => {
    const actionInput = playerInputBuffer.trim();
    if (!actionInput) return;

    if (isEmergencyStopActive || !isMountedRef.current || (creationStep as CreationStep) !== 'CREATION_COMPLETE' || !gameState || !gameState.isAwaitingPlayerAction || isLoadingAI) {
      localAddMessageToTerminal(SYSTEM_SENDER_NAME, "Cannot process action now.", 'text-yellow-500');
      return;
    }
    
    addToLocalCommandHistory(actionInput);
    localCommandHistoryIndexRef.current = -1;
    setPlayerInputBuffer(""); 

    localAddMessageToTerminal("USER_INPUT", actionInput, CHIMERA_PLAYER_COLOR); 
    setIsLoadingAI(true);
    setCurrentlyProcessingChimeraAiName(CHIMERA_PLAYER_SENDER_NAME); // Player AI is now "thinking"
    setGameState(prev => prev ? { ...prev, isAwaitingPlayerAction: false } : null);

    let playerActionFeedback = `Player AI processes: "${actionInput}". Thinking...`;
    let newPlayerNodeId = gameState.currentNodeId;

    const [actionVerb, ...actionParams] = actionInput.toUpperCase().split(" ");
    if (actionVerb === "MOVE" && actionParams.length > 0 && activeMapData && gameState) {
        const targetNodeId = actionParams[0].toLowerCase(); 
        const currentNode: ChimeraMapNode | undefined = activeMapData.nodes[gameState.currentNodeId];
        const targetNodeData: ChimeraMapNode | undefined = Object.values(activeMapData.nodes).find(n => n.id.toLowerCase() === targetNodeId);

        if (currentNode && targetNodeData && currentNode.connections.includes(targetNodeData.id)) {
            newPlayerNodeId = targetNodeData.id;
            playerActionFeedback = `Player AI Action: MOVE to ${targetNodeData.name}.`;
        } else if (targetNodeData) {
             playerActionFeedback = `Player AI Action: Cannot MOVE to ${targetNodeData.name}. Invalid or unconnected path.`;
        } else {
            playerActionFeedback = `Player AI Action: Cannot MOVE to ${targetNodeId}. Target node does not exist.`;
        }
    } else {
        playerActionFeedback = `Player AI Action: (Example) ${actionInput}. Outcome pending DM.`;
    }
    
    const playerAiMsgId = localAddMessageToTerminal(CHIMERA_PLAYER_SENDER_NAME, playerActionFeedback, CHIMERA_PLAYER_COLOR, true);
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 500)); 
    if (!isMountedRef.current) { setIsLoadingAI(false); setCurrentlyProcessingChimeraAiName(null); return; }
    
    setChimeraTerminalMessages(prev => prev.map(m => m.id === playerAiMsgId ? {...m, text: playerActionFeedback, id: m.id} : m));
    handleLocalTypingComplete(playerAiMsgId); // This will also clear currentlyProcessingChimeraAiName

    if (gameState && newPlayerNodeId !== gameState.currentNodeId) {
        setGameState(prev => prev ? {
            ...prev, 
            currentNodeId: newPlayerNodeId,
            playerCharacter: {...prev.playerCharacter, grid_pos: newPlayerNodeId } 
        } : null);
        
        const currentActiveMapNode = activeMapData?.nodes?.[newPlayerNodeId];
        if (currentActiveMapNode?.interactableObjectIds) {
             const interactableIdsForNode = currentActiveMapNode.interactableObjectIds;
             const allInteractablesList = chimeraLocationData.flatMap(loc => loc.interactables); 
             const nodeInteractables = allInteractablesList.filter(obj => interactableIdsForNode?.includes(obj.id));
            setCurrentMapInteractables(nodeInteractables);
        } else {
            setCurrentMapInteractables([]);
        }
    }
    
    setIsLoadingAI(false); // Player AI processing done
    // currentlyProcessingChimeraAiName is cleared by handleLocalTypingComplete
    gameLoopTimeoutRef.current = setTimeout(runGameTurn, 500); 
  };

  useEffect(() => {
    if (isEmergencyStopActive || !isMountedRef.current || creationStep === 'CREATION_COMPLETE' || gameState || appInitializationError) {
      return;
    }
  
    const performCreationStep = async () => {
      if (isEmergencyStopActive || !isMountedRef.current || gameState || appInitializationError) {
        setIsLoadingAI(false); setCurrentlyProcessingChimeraAiName(null); return;
      }
  
      if (!dmAiChat || !playerAiChat) {
        localAddMessageToTerminal(SYSTEM_SENDER_NAME, "Critical AI components (DM or Player) are not ready for character creation.", 'text-red-500');
        setIsLoadingAI(false); setCurrentlyProcessingChimeraAiName(null);
        return;
      }
      setIsLoadingAI(true);
      let msgId: string | undefined;
  
      try {
        switch (creationStep) {
          case 'AWAITING_ARCHETYPES':
            if (!creationStepProgressRef.current.dmMessageSent) {
              setCurrentlyProcessingChimeraAiName(CHIMERA_DM_SENDER_NAME);
              msgId = localAddMessageToTerminal(CHIMERA_DM_SENDER_NAME, "DM is proposing archetypes...", CHIMERA_DM_COLOR, true);
              await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
              if (!isMountedRef.current) break;
              setChimeraTerminalMessages(prev => prev.map(m => m.id === msgId ? {...m, text: "Choose your path: Street Samurai, Netrunner, or Corporate Agent.", id: m.id} : m));
              handleLocalTypingComplete(msgId);
              creationStepProgressRef.current.dmMessageSent = true;
              setCreationStep('AWAITING_PLAYER_CHOICE');
            }
            break;
          case 'AWAITING_PLAYER_CHOICE':
            if (!creationStepProgressRef.current.playerMessageSent) {
              setCurrentlyProcessingChimeraAiName(CHIMERA_PLAYER_SENDER_NAME);
              msgId = localAddMessageToTerminal(CHIMERA_PLAYER_SENDER_NAME, "Player AI is choosing archetype...", CHIMERA_PLAYER_COLOR, true);
              await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
              if (!isMountedRef.current) break;
              setChimeraTerminalMessages(prev => prev.map(m => m.id === msgId ? {...m, text: "Player AI chooses 'Netrunner'.", id: m.id} : m));
              handleLocalTypingComplete(msgId);
              creationStepProgressRef.current.playerMessageSent = true;
              setCreationStep('GENERATING_AVATAR');
            }
            break;
          case 'GENERATING_AVATAR':
             if (!creationStepProgressRef.current.avatarGenerated && genAI) {
                setIsGeneratingAvatar(true);
                setCurrentlyProcessingChimeraAiName("SYSTEM"); // Avatar gen is system
                const avatarMsgId = localAddMessageToTerminal(SYSTEM_SENDER_NAME, "Generating player avatar...", 'text-purple-400', false);
                let avatarUrl = "/chimeraavatar.jpg"; 
                generatedAvatarUrlRef.current = "/chimeraavatar.jpg"; // Set fallback immediately
                try {
                    if (isEmergencyStopActive) break;
                    const imageResponse = await genAI.models.generateImages({
                        model: IMAGEN_MODEL_NAME,
                        prompt: "Cyberpunk netrunner, dark alley, neon lights, hooded figure, intricate cybernetics, detailed portrait.",
                        config: { numberOfImages: 1, outputMimeType: 'image/jpeg' }
                    });
                    if (imageResponse.generatedImages && imageResponse.generatedImages[0]?.image.imageBytes) {
                        avatarUrl = `data:image/jpeg;base64,${imageResponse.generatedImages[0].image.imageBytes}`;
                        generatedAvatarUrlRef.current = avatarUrl; // Update with generated one
                        setChimeraTerminalMessages(prev => prev.map(m => m.id === avatarMsgId ? {...m, text: "Player avatar generated.", id: m.id} : m));
                    } else { throw new Error("No image data for avatar"); }
                } catch (err) {
                    console.error("Avatar generation failed:", err);
                     const errorText = err instanceof Error && (err as any).message?.includes("RESOURCE_EXHAUSTED") 
                        ? "Avatar generation failed (Quota Exceeded). Using local placeholder."
                        : "Avatar generation failed. Using local placeholder.";
                    setChimeraTerminalMessages(prev => prev.map(m => m.id === avatarMsgId ? {...m, text: errorText, id: m.id} : m));
                    // generatedAvatarUrlRef.current remains "/chimeraavatar.jpg"
                } finally {
                    if (isMountedRef.current) {
                        handleLocalTypingComplete(avatarMsgId); // Will clear currentLocalTypingMessageId
                        setCurrentlyProcessingChimeraAiName(null); // Clear processing name
                        setIsGeneratingAvatar(false);
                        creationStepProgressRef.current.avatarGenerated = true;
                        setCreationStep('AWAITING_INCITING_INCIDENT');
                    }
                }
            } else if (creationStepProgressRef.current.avatarGenerated) {
                setCreationStep('AWAITING_INCITING_INCIDENT');
            } else if (!genAI) {
                 localAddMessageToTerminal(SYSTEM_SENDER_NAME, "Image generation service not available. Using local placeholder.", 'text-yellow-500', false);
                 creationStepProgressRef.current.avatarGenerated = true; 
                 generatedAvatarUrlRef.current = "/chimeraavatar.jpg";
                 setCreationStep('AWAITING_INCITING_INCIDENT');
            }
            break;
          case 'AWAITING_INCITING_INCIDENT':
            if (!creationStepProgressRef.current.incitingIncidentSet && creationStepProgressRef.current.avatarGenerated) {
              setCurrentlyProcessingChimeraAiName(CHIMERA_DM_SENDER_NAME);
              msgId = localAddMessageToTerminal(CHIMERA_DM_SENDER_NAME, "DM is describing the inciting incident...", CHIMERA_DM_COLOR, true);
              await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
              if (!isMountedRef.current) break;

              const avatarUrlToUse = generatedAvatarUrlRef.current; // This will be /chimeraavatar.jpg or a data URL
              
              const initialMapId = "chimera_twin_peaks_main";
              const initialMap = chimeraMaps[initialMapId];
              if (!initialMap) {
                localAddMessageToTerminal(SYSTEM_SENDER_NAME, `FATAL ERROR: Initial map '${initialMapId}' not found. Aborting creation.`, 'text-red-500');
                setCreationStep('IDLE'); 
                break;
              }
              const entryNodeId = initialMap.defaultEntryNodeId || Object.keys(initialMap.nodes)[0];

              const initialPlayerChar: ChimeraCharacter = {
                id: 'PLAYER', name: 'Kaelen', 
                stats: { STR: 10, AGI: 14, INT: 16, TEC: 15, PRE: 10 }, 
                hp: { current: 25, max: 25 }, ac: 12, level: 1,
                xp: { current: 0, toNext: 100 }, skills: { Hacking: 3, Electronics: 2, Perception: 1 },
                feats: ["Quick Hack", "Neural Interface"], inventory: [CHIMERA_ITEM_DEFINITIONS["pistol_basic"], CHIMERA_ITEM_DEFINITIONS["medkit_basic"]], activeEffects: [], isAlive: true,
                grid_pos: entryNodeId, 
                avatarUrl: avatarUrlToUse,
                avatarHistory: [avatarUrlToUse],
              };
              
              setActiveMapData(initialMap);
              const initialMapNode = initialMap.nodes[entryNodeId];
              if (initialMapNode?.interactableObjectIds) {
                  const allInteractablesList = chimeraLocationData.flatMap(loc => loc.interactables);
                  const nodeInteractables = allInteractablesList.filter(obj => initialMapNode.interactableObjectIds!.includes(obj.id));
                  setCurrentMapInteractables(nodeInteractables);
              } else {
                  setCurrentMapInteractables([]);
              }

              setGameState({
                mode: 'EXPLORATION',
                playerCharacter: initialPlayerChar,
                combatants: { 'PLAYER': initialPlayerChar },
                turnOrder: ['PLAYER'], activeTurnIndex: 0,
                worldState: { playerArchetype: "Netrunner", playerBackstory: "A reclusive netrunner pulled into the neon shadows of Neo-Kyoto." },
                isAwaitingPlayerAction: true,
                dmNarrative: "A datachip slides into your hand. 'Urgent. Arcos Corp. Big creds.' The message flickers on your retinal display.",
                currentMapId: initialMap.id,
                currentNodeId: entryNodeId,
                quests: [{ id: 'q1', title: "The Arcos Job", description: "Investigate Arcos Corp for a mysterious client.", status: 'active', objectives: [{id: 'obj1', description: "Find intel on Project Chimera", completed: false}] }],
                activeLocalLog: [],
                currentAutonomousTurns: 0,
              });
              
              setChimeraTerminalMessages(prev => prev.map(m => m.id === msgId ? {...m, text: "A datachip slides into your hand. 'Urgent. Arcos Corp. Big creds.' The message flickers on your retinal display.", id: m.id} : m));
              handleLocalTypingComplete(msgId);
              creationStepProgressRef.current.incitingIncidentSet = true;
              setCreationStep('CREATION_COMPLETE');
            }
            break;
        }
      } catch (error) {
        console.error("Error in character creation step:", creationStep, error);
        localAddMessageToTerminal(SYSTEM_SENDER_NAME, `Error during ${creationStep}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'text-red-500');
      } finally {
        if (isMountedRef.current) {
            setIsLoadingAI(false); 
            if (creationStep !== 'GENERATING_AVATAR') { // Avatar step handles its own name clearing
                 setCurrentlyProcessingChimeraAiName(null);
            }
        }
      }
    };

    if (creationStep !== 'IDLE' && (creationStep as CreationStep) !== 'CREATION_COMPLETE' && !isLoadingAI) {
       performCreationStep();
    }
  }, [creationStep, dmAiChat, playerAiChat, genAI, gameState, appInitializationError, isEmergencyStopActive, localAddMessageToTerminal, handleLocalTypingComplete, isLoadingAI]);


  const handleFacilitatorSubmit = () => {
    if (isEmergencyStopActive) return;
    const input = facilitatorInputValue.trim();
    setFacilitatorInputValue("");
    addToLocalCommandHistory(input);
    localCommandHistoryIndexRef.current = -1;

    localAddMessageToTerminal(FACILITATOR_SENDER_NAME, `Input: ${input}`, 'text-[var(--color-facilitator)]');

    if (input.toUpperCase() === 'Y') {
      setIsAwaitingChimeraContinuation(false);
      chimeraTurnCountRef.current = 0; 
      localAddMessageToTerminal(SYSTEM_SENDER_NAME, "Simulation continued by facilitator.", 'text-green-400');
      gameLoopTimeoutRef.current = setTimeout(runGameTurn, 500);
    } else if (input.toUpperCase() === 'N') {
      localAddMessageToTerminal(SYSTEM_SENDER_NAME, "Chimera simulation halted by facilitator. Select a new mode or restart.", 'text-yellow-400');
      setIsAwaitingChimeraContinuation(false);
       // Changed from AppMode.SPIRAL_EXE to AppMode.SEMANTIC_ESCAPE_EXE as SPIRAL_EXE is disabled
      onModeChange(AppMode.SEMANTIC_ESCAPE_EXE); 
    } else {
      if (gameState) {
          setGameState(prev => prev ? {...prev, dmNarrative: `Facilitator directs player: "${input}". ${prev.dmNarrative}`, isAwaitingPlayerAction: true } : null);
          setIsAwaitingChimeraContinuation(false);
          chimeraTurnCountRef.current = 0; 
          localAddMessageToTerminal(SYSTEM_SENDER_NAME, "New directive issued. Player action required.", 'text-purple-400');
      }
    }
  };
  
  const addToLocalCommandHistory = (command: string) => {
    if (command.trim() === "") return;
    setLocalCommandHistory(prev => {
      const newHistory = [command, ...prev.filter(c => c !== command)];
      return newHistory.slice(0, 20); 
    });
  };

  const handleLocalCommandNav = (direction: 'up' | 'down') => {
    if (localCommandHistory.length === 0) return;
    let newIndex = localCommandHistoryIndexRef.current;
    if (direction === 'up') {
      newIndex = Math.min(localCommandHistoryIndexRef.current + 1, localCommandHistory.length - 1);
    } else {
      newIndex = Math.max(localCommandHistoryIndexRef.current - 1, -1);
    }
    localCommandHistoryIndexRef.current = newIndex;
    const commandToSet = newIndex === -1 ? "" : localCommandHistory[newIndex];
    
    if (isAwaitingChimeraContinuation) {
        setFacilitatorInputValue(commandToSet);
    } else if (gameState?.isAwaitingPlayerAction) {
        setPlayerInputBuffer(commandToSet);
    }
  };

  if (!hasProcessedInitialLoad && appInitializationError && !propInitialGameState) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 bg-[var(--color-bg-page)] text-[var(--color-text-base)]">
        <h2 className="text-xl font-bold text-[var(--color-text-heading)] mb-4">CHIMERA PROTOCOL - INIT ERROR</h2>
        <p className="text-[var(--color-error)] mb-2 text-center">
          {appInitializationError}
        </p>
        <p className="text-[var(--color-text-muted)] text-center">Ensure API key is valid and network is stable. Try switching modes and returning.</p>
         <button 
            onClick={() => onModeChange(AppMode.SEMANTIC_ESCAPE_EXE)} // Changed from AppMode.SPIRAL_EXE
            className="mt-6 px-4 py-2 bg-[var(--color-bg-button-secondary)] text-[var(--color-text-button-secondary)] rounded hover:bg-[var(--color-bg-button-secondary-hover)] focus-ring-accent"
        >
            Return to Main Terminal
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-[var(--color-bg-page)] text-[var(--color-text-base)] p-1 md:p-2 overflow-hidden">
      {currentAppMode === AppMode.CHIMERA_EXE && (
        <header className="w-full flex-shrink-0 p-2 mb-1 bg-[var(--color-bg-panel)] rounded-md shadow-md border-2 border-[var(--color-border-strong)] flex justify-between items-center">
          <h1 className="text-md md:text-lg font-bold text-[var(--color-text-heading)]">CHIMERA PROTOCOL</h1>
          <div className="flex items-center space-x-2">
            <button
              onClick={onEmergencyStopToggle}
              className={`px-2.5 py-1 rounded text-xs font-semibold border-2 transition-all
                          ${isEmergencyStopActive 
                              ? 'bg-green-500 border-green-600 hover:bg-green-400 text-white' 
                              : 'bg-red-500 border-red-600 hover:bg-red-400 text-white'}`}
            >
              {isEmergencyStopActive ? 'RESUME AI' : 'STOP AI'}
            </button>
            <select
              value={currentAppMode}
              onChange={(e) => onModeChange(e.target.value as AppMode)}
              className="bg-[var(--color-bg-dropdown)] border border-[var(--color-border-input)] text-[var(--color-text-base)] p-1 rounded-sm text-xs focus-ring-accent"
              aria-label="Select App Mode"
            >
              {Object.values(AppMode).map(mode => <option key={mode} value={mode}>{mode}</option>)}
            </select>
          </div>
        </header>
      )}

      <div className="flex flex-col md:flex-row flex-grow gap-1 min-h-0">
        <div className="md:w-2/3 flex flex-col gap-1 min-h-0">
          {/* Map Area: Increased height */}
          <div className="h-3/5 md:flex-basis-3/5 min-h-[220px] flex-shrink-0 border-2 border-[var(--color-border-base)] rounded">
            <ChimeraMapDisplay 
              mapData={activeMapData} 
              currentNodeId={gameState?.currentNodeId || null} 
              onNodeClick={(nodeId) => {
                if (gameState?.isAwaitingPlayerAction) {
                   setPlayerInputBuffer(`MOVE ${nodeId}`);
                }
              }}
            />
          </div>
          {/* Log Area: Reduced height (due to map increase) */}
          <div className="h-2/5 md:flex-basis-2/5 flex-grow min-h-0"> 
             <TerminalWindow
                title="CHIMERA GAME LOG"
                messages={chimeraTerminalMessages}
                isTypingActive={isLoadingAI && currentLocalTypingMessageId !== null}
                activeTypingMessageId={currentLocalTypingMessageId}
                onTypingComplete={handleLocalTypingComplete}
                typingSpeed={typingSpeed}
                isPromptingUser={isAwaitingChimeraContinuation || (gameState?.isAwaitingPlayerAction && creationStep === 'CREATION_COMPLETE')}
                userInputValue={isAwaitingChimeraContinuation ? facilitatorInputValue : playerInputBuffer}
                onUserInputChange={(val) => {
                    if (isAwaitingChimeraContinuation) setFacilitatorInputValue(val);
                    else setPlayerInputBuffer(val);
                    localCommandHistoryIndexRef.current = -1; 
                }}
                onUserPromptSubmit={() => {
                    if (isAwaitingChimeraContinuation) handleFacilitatorSubmit();
                    else handlePlayerActionSubmit();
                }}
                currentMode={AppMode.CHIMERA_EXE} 
                commandHistory={localCommandHistory} 
                onCommandHistoryNavigation={handleLocalCommandNav} 
                className="h-full"
                isAppAiProcessing={isLoadingAI} // Use local isLoadingAI for Chimera's terminal
                appProcessingAiName={currentlyProcessingChimeraAiName} // Use local AI name
                isAwaitingChimeraContinuation={isAwaitingChimeraContinuation}
             />
          </div>
        </div>
        <div className="md:w-1/3 min-h-0"> 
          <ChimeraSidebar 
            gameState={gameState}
            activeMapData={activeMapData} 
            isGeneratingAvatar={isGeneratingAvatar}
            onSaveGameRequest={onSaveGameRequest}
            onLoadGameRequest={onLoadGameRequest}
            onUpdateAvatarRequest={() => { 
                if(gameState?.playerCharacter && genAI && !isGeneratingAvatar && !isEmergencyStopActive) {
                    const regenerate = async () => {
                        setIsGeneratingAvatar(true);
                        setCurrentlyProcessingChimeraAiName("SYSTEM"); // Image gen is a system task
                        generatedAvatarUrlRef.current = "/chimeraavatar.jpg"; // Set to fallback during generation
                        const avatarMsgId = localAddMessageToTerminal(SYSTEM_SENDER_NAME, "Regenerating player avatar...", 'text-purple-400', false);
                        let newAvatarUrl = "/chimeraavatar.jpg"; 
                        try {
                             const imageResponse = await genAI.models.generateImages({
                                model: IMAGEN_MODEL_NAME,
                                prompt: `Cyberpunk character: ${gameState.worldState?.playerArchetype || 'figure'}, ${gameState.worldState?.playerBackstory?.substring(0,50) || 'in a neon city'}, cinematic portrait, detailed cybernetics.`,
                                config: { numberOfImages: 1, outputMimeType: 'image/jpeg' }
                            });
                            if (imageResponse.generatedImages && imageResponse.generatedImages[0]?.image.imageBytes) {
                                newAvatarUrl = `data:image/jpeg;base64,${imageResponse.generatedImages[0].image.imageBytes}`;
                                setChimeraTerminalMessages(prevMsgs => prevMsgs.map(m => m.id === avatarMsgId ? {...m, text: "Player avatar updated.", id: m.id} : m));
                            } else { throw new Error("No image data for avatar.")}
                        } catch (err) { 
                            console.error("Avatar regen failed:", err); 
                            setChimeraTerminalMessages(prevMsgs => prevMsgs.map(m => m.id === avatarMsgId ? {...m, text: "Avatar regeneration failed. Using local placeholder.", id: m.id} : m));
                            newAvatarUrl = "/chimeraavatar.jpg"; 
                        }
                        
                        if(isMountedRef.current) {
                            generatedAvatarUrlRef.current = newAvatarUrl; // Store result
                            setGameState(prev => {
                                if (!prev || !prev.playerCharacter) return prev;
                                const newHistory = [...(prev.playerCharacter.avatarHistory || []), newAvatarUrl].slice(-5); 
                                return {
                                    ...prev, 
                                    playerCharacter: {
                                        ...prev.playerCharacter, 
                                        avatarUrl: newAvatarUrl,
                                        avatarHistory: newHistory
                                    }
                                };
                            });
                            handleLocalTypingComplete(avatarMsgId); // Will clear currentLocalTypingMessageId
                            setCurrentlyProcessingChimeraAiName(null); // Clear processing name
                            setIsGeneratingAvatar(false);
                        }
                    };
                    regenerate();
                }
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default ChimeraModeContainer;