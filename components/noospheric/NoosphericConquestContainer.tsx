
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Chat, GenerateContentResponse } from '@google/genai';
import {
    AppMode, ThemeName, NoosphericGameState, NoosphericPlayerId,
    NoosphericFaction, NoosphericNodeData, NoosphericPhase, SystemLogEntry, BattleLogEntry, NoosphericAIResponse,
    NoosphericMapType, BattleReportData, TacticalAnalysisEntry, DiceRollDetail, ModeInfo, LyriaPlaybackState
} from '../../types';
import {
    AI1_NAME, AI2_NAME, SYSTEM_SENDER_NAME, THEMES, NOOSPHERIC_CONQUEST_START_MESSAGE, FAB_HUB_ACTIVATION_COST,
    FAB_HUB_GARRISON_MIN, EVOLVE_UNIT_COST, DEPLOY_STANDARD_UNIT_COST, MAX_NOOSPHERIC_RETRY_ATTEMPTS,
    GREAT_WAR_AI_SYSTEM_PROMPT_ADDENDUM, EVOLVED_UNIT_COMBAT_BONUS, MODE_INFO_CONTENT
} from '../../constants';
import NoosphericMapDisplay from './NoosphericMapDisplay';
import NoosphericSidebar from './NoosphericSidebar';
import BattleReportModal from './BattleReportModal';
import NoosphericModifiersModal, { Modifier } from './NoosphericModifiersModal';
import { getMapDataByType, calculateInitialFactionData, ALL_MAP_TYPES, NOOSPHERIC_MAP_DATA_PATH_FOR_COMPONENTS } from '../../data/noospheric-map-data';

interface NoosphericConquestContainerProps {
  ai1Chat: Chat | null;
  ai2Chat: Chat | null;
  apiKeyMissing: boolean;
  initialGameState?: NoosphericGameState;
  initialMapType?: NoosphericMapType;
  isGameStartedFromBackup?: boolean;
  currentAppMode: AppMode;
  onModeChange: (newMode: AppMode) => void;
  activeTheme: ThemeName;
  isAiReadyForNoosphericFromApp: boolean;
  appInitializationError: string | null;
  onOpenInfoModal: () => void;
  lyriaPlaybackState: LyriaPlaybackState;
  onLyriaPlayPause: () => void;
  isLyriaReady: boolean;
  isEmergencyStopActive: boolean;
}

const DEFAULT_MAX_TURNS = 40;
const AI_DECISION_DELAY_MS = 500;
const PHASE_ADVANCE_DELAY_MS = 250; // Delay for automatic phase transitions
const AI_RESPONSE_TIMEOUT_MS = 60000; // 60 seconds for AI response

const NoosphericConquestContainer: React.FC<NoosphericConquestContainerProps> = ({
  ai1Chat,
  ai2Chat,
  apiKeyMissing,
  initialGameState: propInitialGameState,
  initialMapType = "The Tartarus Anomaly",
  isGameStartedFromBackup: propIsGameStartedFromBackup = false,
  currentAppMode,
  onModeChange,
  activeTheme,
  isAiReadyForNoosphericFromApp,
  appInitializationError,
  onOpenInfoModal,
  lyriaPlaybackState,
  onLyriaPlayPause,
  isLyriaReady,
  isEmergencyStopActive,
}) => {
  const [currentMapTypeInternal, setCurrentMapTypeInternal] = useState<NoosphericMapType>(initialMapType);
  const [isGameStarted, setIsGameStarted] = useState(propIsGameStartedFromBackup && !!propInitialGameState);
  const [isModifiersModalOpen, setIsModifiersModalOpen] = useState(false);
  const [activeModifiers, setActiveModifiers] = useState<Record<string, boolean>>({
    isGreatWarMode: propInitialGameState?.isGreatWarMode ?? false,
    isFogOfWarActive: propInitialGameState?.isFogOfWarActive ?? false,
  });
  
  const [showGemQAnalysisHistory, setShowGemQAnalysisHistory] = useState(false);
  const [showAxiomAnalysisHistory, setShowAxiomAnalysisHistory] = useState(false);
  const [isDataMenuOpen, setIsDataMenuOpen] = useState(false); // New state for save/load dropdown


  // --- New Refs for RAF Loop ---
  const gameLoopIdRef = useRef<number>(0);
  const lastTickTimestampRef = useRef<number>(Date.now());
  const timeSinceLastActionRef = useRef<number>(0);
  // --- End New Refs ---


  const isNodeConnectedToCN = useCallback((nodeId: string, ownerId: NoosphericPlayerId, currentMapNodes: Record<string, NoosphericNodeData>): boolean => {
    if (!ownerId || ownerId === 'NEUTRAL') return false;
    if (!currentMapNodes || Object.keys(currentMapNodes).length === 0) {
        return false;
    }
    const targetNodeData = currentMapNodes[nodeId];
    if (!targetNodeData) {
        return false;
    }
    if (targetNodeData.owner !== ownerId) return false;

    const queue: string[] = [nodeId];
    const visited: Set<string> = new Set([nodeId]);
    while (queue.length > 0) {
        const currentNodeId = queue.shift()!;
        const currentNode = currentMapNodes[currentNodeId];
        if (!currentNode || currentNode.owner !== ownerId) continue;
        if (currentNode.isCN) return true;

        for (const neighborId of currentNode.connections) {
            if (!visited.has(neighborId)) {
                visited.add(neighborId);
                const neighborNode = currentMapNodes[neighborId];
                if (neighborNode && neighborNode.owner === ownerId) {
                    queue.push(neighborId);
                }
            }
        }
    }
    return false;
  }, []);


  const createInitialGameState = useCallback((mapType: NoosphericMapType, gameJustStarted: boolean = false, explicitFogStatus?: boolean): NoosphericGameState => {
    const isFogActive = explicitFogStatus !== undefined ? explicitFogStatus : activeModifiers.isFogOfWarActive;
    const isGreatWarModeActive = activeModifiers.isGreatWarMode;

    const mapData = getMapDataByType(mapType, isFogActive);
    const factionData = calculateInitialFactionData(mapData);
    let initialMessage = `Noospheric Conquest setup for ${mapType} map. Fog of War: ${isFogActive ? 'ON' : 'OFF'}. Great War: ${isGreatWarModeActive ? 'ON' : 'OFF'}.`;
    if (gameJustStarted) {
        initialMessage = `Noospheric Conquest game started on ${mapType} map. FoW: ${isFogActive ? 'ON' : 'OFF'}. Great War: ${isGreatWarModeActive ? 'ON' : 'OFF'}. Turn 1, FLUCTUATION Phase.`;
    }
    
    const initialGameState: NoosphericGameState = {
      turn: gameJustStarted ? 1 : 0,
      currentPhase: 'FLUCTUATION',
      activePlayer: 'GEM-Q',
      mapNodes: mapData,
      factions: {
        'GEM-Q': { ...factionData['GEM-Q'], tacticalAnalysis: "Awaiting game start..." },
        'AXIOM': { ...factionData['AXIOM'], tacticalAnalysis: "Awaiting scenario parameters..." },
      },
      systemLog: [{ id: `sys-${Date.now()}`, timestamp: new Date().toISOString(), turn: gameJustStarted ? 1 : 0, phase: 'FLUCTUATION', message: initialMessage, type: 'EVENT' }],
      battleLog: [],
      mapType: mapType,
      isPaused: false,
      winner: undefined,
      isFogOfWarActive: isFogActive,
      isGreatWarMode: isGreatWarModeActive,
    };
    return initialGameState;
  }, [activeModifiers.isFogOfWarActive, activeModifiers.isGreatWarMode]);

  const [gameState, setGameState] = useState<NoosphericGameState>(() => {
    if (propInitialGameState && propIsGameStartedFromBackup) {
      return propInitialGameState;
    }
    return createInitialGameState(currentMapTypeInternal, false, activeModifiers.isFogOfWarActive);
  });
  const gameStateRef = useRef(gameState);
  const isMountedRef = useRef(true);
  const loadGameInputRef = useRef<HTMLInputElement>(null);


  const [isLoadingAI, setIsLoadingAI] = useState<NoosphericPlayerId | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [latestBattleReportForModal, setLatestBattleReportForModal] = useState<BattleReportData | null>(null);
  const gameIsOverRef = useRef(false); 
  const dataDivRef = useRef<HTMLDivElement>(null);

  // Timer display states (formatted strings)
  const [currentPhaseTimeDisplay, setCurrentPhaseTimeDisplay] = useState<string>("--:--.-");
  const [averageFullTurnTimeDisplay, setAverageFullTurnTimeDisplay] = useState<string>("--:--.-");
  const [lastAiProcessingTimeDisplay, setLastAiProcessingTimeDisplay] = useState<string>("--:--.-");
  const [totalGameTimeDisplay, setTotalGameTimeDisplay] = useState<string>("--:--.-");

  // Raw timer values (milliseconds) - states for triggering updates
  const [totalGameTimeMs, setTotalGameTimeMs] = useState(0);
  const [currentPhaseTimeMs, setCurrentPhaseTimeMs] = useState(0);

  // Timestamp and accumulator refs for timer logic
  const gameStartTimestampRef = useRef<number | null>(null);
  const phaseStartTimestampRef = useRef<number | null>(null);
  const aiTurnStartTimeRef = useRef<number | null>(null); // For individual AI processing
  const currentTurnStartTimestampRef = useRef<number | null>(null); // For full turn duration

  const elapsedGameTimeBeforePauseRef = useRef<number>(0);
  const elapsedPhaseTimeBeforePauseRef = useRef<number>(0);
  const elapsedIndividualAiTurnTimeBeforePauseRef = useRef<number>(0); // For specific AI processing pause

  const allFullTurnDurationsMsRef = useRef<number[]>([]);
  const completedFullTurnsRef = useRef<number>(0); // Counter to trigger average update
  const lastTurnDurationMsRef = useRef<number | null>(null); // Stores duration of last AI processing
  
  const kjControlStreakRef = useRef<{ 'GEM-Q': number; 'AXIOM': number }>({ 'GEM-Q': 0, 'AXIOM': 0 });

  // Add this new useEffect inside the NoosphericConquestContainer component
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        // A more robust way to check might involve refs on the button and menu
        // but for this simple case, checking the class of the target is sufficient.
        const target = event.target as HTMLElement;
        if (isDataMenuOpen && !target.closest('.relative')) { // Assuming this is specific enough
            setIsDataMenuOpen(false);
        }
    };

    if (isDataMenuOpen) {
        document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDataMenuOpen]);


  const availableModifiers: Modifier[] = [
    {
      id: 'isGreatWarMode',
      label: 'The Great War',
      description: `Disables KJ control victory. Victory is by total annihilation: capture all enemy CNs OR eliminate all units when they lack QR for deployment. KJs become vital Fabrication Hubs for Evolved Units. AI may surrender if situation is hopeless. Evolved Units gain +${EVOLVED_UNIT_COMBAT_BONUS} in combat.`
    },
    {
      id: 'isFogOfWarActive',
      label: 'Fog of War',
      description: 'Limits visibility to owned and adjacent nodes. Enemy unit counts, total QR, and distant nodes are hidden. Exploration and probing attacks are crucial.'
    }
  ];

  useEffect(() => {
    gameStateRef.current = gameState;
    gameIsOverRef.current = gameState.currentPhase === 'GAME_OVER' && gameState.winner !== undefined;
    if (dataDivRef.current) {
        try {
            dataDivRef.current.dataset.noosphericGameState = JSON.stringify(gameState);
            dataDivRef.current.dataset.noosphericMapType = gameState.mapType;
        } catch (e) {
            console.error("Error stringifying gameState for data attribute:", e, gameState);
        }
    }
  }, [gameState]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const isOverallAiReady = isAiReadyForNoosphericFromApp && !!ai1Chat && !!ai2Chat && !apiKeyMissing;

  const addSystemLog = useCallback((message: string, type: SystemLogEntry['type'], source?: NoosphericPlayerId, explicitTurn?: number, explicitPhase?: NoosphericPhase) => {
    if (type === 'ERROR' || type === 'EVENT' || (type === 'AI_ACTION' && (message.includes("surrenders") || message.includes("activated Fabrication Hub") || message.includes("evolved") || message.includes("captured neutral")) )) { 
        console.log(`[NC Log] (${type}) ${source ? source + ': ' : ''}${message} (T:${explicitTurn !== undefined ? explicitTurn : gameStateRef.current.turn}, P:${explicitPhase !== undefined ? explicitPhase : gameStateRef.current.currentPhase})`);
    }
    setGameState(prev => ({
      ...prev,
      systemLog: [...prev.systemLog, {
        id: `sys-${Date.now()}-${Math.random().toString(36).substring(2,9)}`,
        timestamp: new Date().toISOString(),
        turn: explicitTurn !== undefined ? explicitTurn : prev.turn,
        phase: explicitPhase !== undefined ? explicitPhase : prev.currentPhase,
        message,
        type,
        source
      }].slice(-100) 
    }));
  }, []);


  const addBattleLog = useCallback((logData: Omit<BattleLogEntry, 'id' | 'timestamp'>) => {
    const battleLogEntry: BattleLogEntry = {
        ...logData,
        id: `battle-${Date.now()}-${Math.random().toString(36).substring(2,9)}`,
        timestamp: new Date().toISOString(),
    };
    addSystemLog(`Battle at ${logData.nodeName || logData.nodeId}: ${logData.attacker} vs ${logData.defender}. Outcome: ${logData.outcome}. Attacker Losses: ${logData.attackerLosses}, Defender Losses: ${logData.defenderLosses}.`, 'EVENT');
    setGameState(prev => {
      const updatedFactions = { ...prev.factions };
      if (logData.outcome === 'ATTACKER_WINS') {
        updatedFactions[logData.attacker].successfulAttacks = (updatedFactions[logData.attacker].successfulAttacks || 0) + 1;
        if (logData.defender !== 'NEUTRAL') {
            updatedFactions[logData.defender].defensesLost = (updatedFactions[logData.defender].defensesLost || 0) + 1;
        }
      } else if (logData.outcome === 'DEFENDER_WINS') {
        updatedFactions[logData.attacker].attacksLost = (updatedFactions[logData.attacker].attacksLost || 0) + 1;
        if (logData.defender !== 'NEUTRAL') {
            updatedFactions[logData.defender].successfulDefenses = (updatedFactions[logData.defender].successfulDefenses || 0) + 1;
        }
      }

      updatedFactions[logData.attacker].unitsLost = (updatedFactions[logData.attacker].unitsLost || 0) + logData.attackerLosses;
      if (logData.defender !== 'NEUTRAL') {
          updatedFactions[logData.defender].unitsLost = (updatedFactions[logData.defender].unitsLost || 0) + logData.defenderLosses;
      }

      const finalNodeState = prev.mapNodes[logData.nodeId];
      const totalUnitsAtNode = (finalNodeState?.standardUnits || 0) + (finalNodeState?.evolvedUnits || 0);
      const battleReportData: BattleReportData = {
          ...battleLogEntry,
          nodeName: finalNodeState?.regionName || logData.nodeName || 'Unknown Node',
          attackerInitialUnits: logData.attackerInitialUnits || 0,
          defenderInitialUnits: logData.defenderInitialUnits || 0,
          unitsRemainingAtNode: totalUnitsAtNode,
          diceRolls: logData.diceRolls,
      };
      setLatestBattleReportForModal(battleReportData);

      return {
        ...prev,
        battleLog: [...prev.battleLog, battleLogEntry].slice(-20),
        factions: updatedFactions
      };
    });
  }, [addSystemLog]);

  const formatDuration = useCallback((ms: number): string => {
    if (ms < 0) ms = 0;
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const tenths = Math.floor((ms % 1000) / 100);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(tenths).padStart(1,'0')}`;
  },[]);

  const FLUCTUATION_EVENTS: any[] = [
    {
        name: "Quantum Resource Surge",
        description: (target: string) => `${target} experiences a Quantum Resource Surge! +10 QR.`,
        probability: 0.15,
        getTargetPlayer: () => Math.random() < 0.5 ? 'GEM-Q' : 'AXIOM',
        effect: (gs: NoosphericGameState) => {
            const targetPlayer = Math.random() < 0.5 ? 'GEM-Q' : 'AXIOM';
            gs.factions[targetPlayer].qr += 10;
            return gs;
        }
    },
  ];

  const handleFluctuationEvent = useCallback((currentGameState: NoosphericGameState, turnForLog: number): NoosphericGameState => {
    let newGameState = { ...currentGameState };
    const randomNumber = Math.random();
    let cumulativeProbability = 0;
    let eventTriggered = false;
    for (const event of FLUCTUATION_EVENTS) {
        cumulativeProbability += event.probability;
        if (randomNumber < cumulativeProbability) {
            let targetName = "";
            if (event.getTargetPlayer) {
                const targetPlayerId = event.getTargetPlayer(newGameState);
                targetName = targetPlayerId === 'GEM-Q' ? AI1_NAME : targetPlayerId === 'AXIOM' ? AI2_NAME : "NEUTRAL";
            }
            newGameState = event.effect(newGameState);
            addSystemLog(`Fluctuation: ${event.description(targetName)}`, 'EVENT', undefined, turnForLog, 'FLUCTUATION');
            eventTriggered = true;
            break;
        }
    }
    if (!eventTriggered) {
        addSystemLog("Fluctuation: The noosphere remains stable this turn. No unusual events.", 'INFO', undefined, turnForLog, 'FLUCTUATION');
    }
    return newGameState;
  }, [addSystemLog, FLUCTUATION_EVENTS]); 

  const handleModifierChange = (modifierId: string, isActive: boolean) => {
    setActiveModifiers(prev => ({ ...prev, [modifierId]: isActive }));
    setGameState(createInitialGameState(currentMapTypeInternal, false, modifierId === 'isFogOfWarActive' ? isActive : activeModifiers.isFogOfWarActive));
    const modifierLabel = availableModifiers.find(m => m.id === modifierId)?.label || modifierId;
    addSystemLog(`${modifierLabel} turned ${isActive ? 'ON' : 'OFF'}. Map re-initialized for preview.`, "INFO");
  };

  const handleMapTypeChangeInternal = (event: React.ChangeEvent<HTMLSelectElement>) => {
    if (isGameStarted) return;
    const newMapType = event.target.value as NoosphericMapType;
    setCurrentMapTypeInternal(newMapType);
    setGameState(createInitialGameState(newMapType, false, activeModifiers.isFogOfWarActive));
    setSelectedNodeId(null);
    addSystemLog(`Previewing ${newMapType} map. Click 'Start Game' to begin. Fog of War: ${activeModifiers.isFogOfWarActive ? 'ON' : 'OFF'}, Great War: ${activeModifiers.isGreatWarMode ? 'ON' : 'OFF'}`, "INFO");
  };

  const handleStartNewGameClick = useCallback(() => {
    if (!isOverallAiReady) {
        addSystemLog('Cannot start game: AI is not ready. Check API key and initialization.', 'ERROR');
        return;
    }
    const newInitialState = createInitialGameState(currentMapTypeInternal, true, activeModifiers.isFogOfWarActive);
    setGameState(newInitialState);
    setIsGameStarted(true);
    setSelectedNodeId(null);
    setLatestBattleReportForModal(null);

    gameStartTimestampRef.current = Date.now();
    phaseStartTimestampRef.current = Date.now();
    currentTurnStartTimestampRef.current = Date.now();
    aiTurnStartTimeRef.current = null;

    elapsedGameTimeBeforePauseRef.current = 0;
    elapsedPhaseTimeBeforePauseRef.current = 0;
    elapsedIndividualAiTurnTimeBeforePauseRef.current = 0;
    
    allFullTurnDurationsMsRef.current = [];
    completedFullTurnsRef.current = 0;
    lastTurnDurationMsRef.current = 0;

    setTotalGameTimeMs(0);
    setCurrentPhaseTimeMs(0);
    setAverageFullTurnTimeDisplay(formatDuration(0));
    setLastAiProcessingTimeDisplay(formatDuration(0));
    kjControlStreakRef.current = { 'GEM-Q': 0, 'AXIOM': 0 };

  }, [currentMapTypeInternal, createInitialGameState, isOverallAiReady, activeModifiers.isFogOfWarActive, activeModifiers.isGreatWarMode, addSystemLog, formatDuration]);

  const handleNewGameButtonClickInHeader = () => {
    setIsGameStarted(false);
    setIsLoadingAI(null);
    setGameState(prev => ({...createInitialGameState(currentMapTypeInternal, false, activeModifiers.isFogOfWarActive), isPaused: false, winner: undefined, currentPhase: 'FLUCTUATION', turn: 0}));
    setSelectedNodeId(null);
    setLatestBattleReportForModal(null);
    
    gameStartTimestampRef.current = null;
    phaseStartTimestampRef.current = null;
    currentTurnStartTimestampRef.current = null;
    aiTurnStartTimeRef.current = null;

    elapsedGameTimeBeforePauseRef.current = 0;
    elapsedPhaseTimeBeforePauseRef.current = 0;
    elapsedIndividualAiTurnTimeBeforePauseRef.current = 0;
    
    allFullTurnDurationsMsRef.current = [];
    completedFullTurnsRef.current = 0;
    lastTurnDurationMsRef.current = 0;

    setTotalGameTimeMs(0);
    setCurrentPhaseTimeMs(0);
    setAverageFullTurnTimeDisplay(formatDuration(0));
    setLastAiProcessingTimeDisplay(formatDuration(0));
    setCurrentPhaseTimeDisplay(formatDuration(0)); 
    setTotalGameTimeDisplay(formatDuration(0));
    
    addSystemLog(`New game setup initiated. Select map and options. FoW: ${activeModifiers.isFogOfWarActive ? 'ON' : 'OFF'}, Great War: ${activeModifiers.isGreatWarMode ? 'ON' : 'OFF'}`, "INFO");
  };

  const handlePauseToggle = () => {
    if (!isGameStarted) return;
    const newPauseState = !gameStateRef.current.isPaused;
    addSystemLog(newPauseState ? "Simulation Paused." : "Simulation Resumed.", "INFO");

    if (newPauseState) { 
        const now = Date.now();
        if (gameStartTimestampRef.current) {
            elapsedGameTimeBeforePauseRef.current += (now - gameStartTimestampRef.current);
        }
        if (phaseStartTimestampRef.current) {
            elapsedPhaseTimeBeforePauseRef.current += (now - phaseStartTimestampRef.current);
        }
        if (aiTurnStartTimeRef.current) { 
            elapsedIndividualAiTurnTimeBeforePauseRef.current += (now - aiTurnStartTimeRef.current);
        }
        gameStartTimestampRef.current = null;
        phaseStartTimestampRef.current = null;
        aiTurnStartTimeRef.current = null;
    } else { 
        if (isGameStarted && gameStateRef.current.currentPhase !== 'GAME_OVER' && !gameStateRef.current.winner) {
            const now = Date.now();
            gameStartTimestampRef.current = now;
            phaseStartTimestampRef.current = now; 
            if (isLoadingAI) { 
                 aiTurnStartTimeRef.current = now;
            }
        }
    }
    setGameState(prev => ({ ...prev, isPaused: newPauseState }));
  };

  const handleNodeClick = (nodeId: string) => {
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null);
    } else {
      setSelectedNodeId(nodeId);
    }
  };

  const processAIResponse = useCallback((aiResponse: NoosphericAIResponse, player: NoosphericPlayerId) => {
    setGameState(prevGameState => {
        let currentPrev = JSON.parse(JSON.stringify(prevGameState)) as NoosphericGameState;
        currentPrev.factions[player].tacticalAnalysis = aiResponse.tacticalAnalysis;

        aiResponse.actions.forEach(action => {
            const actionNodeLabel = action.nodeId && currentPrev.mapNodes[action.nodeId] ? (currentPrev.mapNodes[action.nodeId]?.label || action.nodeId) : (action.nodeId || "UNKNOWN_NODE");
            const actionFromNodeLabel = action.fromNodeId && currentPrev.mapNodes[action.fromNodeId] ? (currentPrev.mapNodes[action.fromNodeId]?.label || action.fromNodeId) : (action.fromNodeId || "UNKNOWN_NODE");
            const actionToNodeLabel = action.toNodeId && currentPrev.mapNodes[action.toNodeId] ? (currentPrev.mapNodes[action.toNodeId]?.label || action.toNodeId) : (action.toNodeId || "UNKNOWN_NODE");

            let actionDetails = action.fromNodeId ? `from ${actionFromNodeLabel} to ${actionToNodeLabel}` : actionNodeLabel;
            if (action.type === 'EVOLVE_UNITS') actionDetails += ` (Units: ${action.unitsToEvolve || 0})`;
            else if (action.type !== 'ACTIVATE_FABRICATION_HUB') actionDetails += ` (Units: ${action.units || 0})`;

            if ( (action.type !== 'ACTIVATE_FABRICATION_HUB' && (action.units === undefined || action.units <= 0)) &&
                 (action.type === 'EVOLVE_UNITS' && (action.unitsToEvolve === undefined || action.unitsToEvolve <=0))
               ) {
                addSystemLog(`${player} proposed action ${action.type} with invalid units/unitsToEvolve. Action ignored. Details: ${actionDetails}`, 'ERROR', player);
                return;
            }

            let isValidActionForPhase = false;
            if (currentPrev.currentPhase === 'MANEUVER') {
                isValidActionForPhase = ['DEPLOY_UNITS', 'MOVE_UNITS', 'ACTIVATE_FABRICATION_HUB', 'EVOLVE_UNITS'].includes(action.type);
            } else if (currentPrev.currentPhase === 'COMBAT') {
                isValidActionForPhase = action.type === 'ATTACK_NODE';
            }

            if (!isValidActionForPhase) {
                addSystemLog(`${player} submitted invalid action type '${action.type}' for ${currentPrev.currentPhase} phase. Action ignored. Details: ${actionDetails}`, 'ERROR', player);
                return;
            }
             addSystemLog(`${player} action: ${action.type} ${actionDetails}`, 'AI_ACTION', player);

            if (action.type === 'DEPLOY_UNITS' && action.nodeId && action.units) {
                const targetNode = currentPrev.mapNodes[action.nodeId!] as NoosphericNodeData | undefined;
                const unitCost = action.units * DEPLOY_STANDARD_UNIT_COST;
                if (targetNode && targetNode.owner === player && targetNode.isCN && currentPrev.factions[player].qr >= unitCost) {
                    const totalUnitsAtNode = (targetNode.standardUnits || 0) + (targetNode.evolvedUnits || 0);
                    if (totalUnitsAtNode + action.units <= (targetNode.maxUnits || Infinity)) {
                        currentPrev.mapNodes[action.nodeId!].standardUnits = (targetNode.standardUnits || 0) + action.units!;
                        currentPrev.factions[player].qr -= unitCost;
                        currentPrev.factions[player].unitsPurchased = (currentPrev.factions[player].unitsPurchased || 0) + action.units;
                    } else {
                         addSystemLog(`${player} failed to deploy to ${targetNode?.label || action.nodeId}: Exceeds max units (${targetNode.maxUnits}). Requested: ${action.units}, Has: ${totalUnitsAtNode}`, 'ERROR', player);
                    }
                } else {
                    let reason = "Unknown";
                    if (!targetNode) reason = `Target node ${action.nodeId} not found.`;
                    else if (targetNode.owner !== player) reason = `Node ${targetNode.label || action.nodeId} not owned. Owner: ${targetNode.owner}`;
                    else if (!targetNode.isCN) reason = `Node ${targetNode.label || action.nodeId} is not a Command Node.`;
                    else if (currentPrev.factions[player].qr < unitCost) reason = `Insufficient QR. Have: ${currentPrev.factions[player].qr}, Need: ${unitCost}`;
                    addSystemLog(`${player} failed to deploy to ${targetNode?.label || action.nodeId}: ${reason}`, 'ERROR', player);
                }
            }
            else if (action.type === 'MOVE_UNITS' && action.fromNodeId && action.toNodeId && action.units) {
                const fromNodeId = action.fromNodeId!;
                const toNodeId = action.toNodeId!;
                const unitsToMoveCount = action.units!;

                const fromNode = currentPrev.mapNodes[fromNodeId] as NoosphericNodeData | undefined;
                const toNode = currentPrev.mapNodes[toNodeId] as NoosphericNodeData | undefined;

                if (!fromNode) {
                    addSystemLog(`${player} failed to move units: Source node ${fromNodeId} not found.`, 'ERROR', player);
                } else if (!toNode) {
                    addSystemLog(`${player} failed to move units: Target node ${toNodeId} not found.`, 'ERROR', player);
                } else if (fromNode.owner !== player) {
                    addSystemLog(`${player} failed to move units from ${fromNode.label || fromNodeId}: Node not owned. Owner: ${fromNode.owner}`, 'ERROR', player);
                } else if (toNode.owner !== player && toNode.owner !== 'NEUTRAL') {
                    addSystemLog(`${player} failed to move units to ${toNode.label || toNodeId}: Target node owned by opponent (${toNode.owner}). Use ATTACK_NODE.`, 'ERROR', player);
                } else if (!fromNode.connections.includes(toNodeId)) {
                    addSystemLog(`${player} failed to move units from ${fromNode.label || fromNodeId} to ${toNode.label || toNodeId}: Nodes are not connected.`, 'ERROR', player);
                } else {
                    const availableStandard = fromNode.standardUnits || 0;
                    const availableEvolved = fromNode.evolvedUnits || 0;
                    const totalAvailableFromNode = availableStandard + availableEvolved;

                    if (totalAvailableFromNode < unitsToMoveCount) {
                        addSystemLog(`${player} failed to move units from ${fromNode.label || fromNodeId}: Insufficient units. Have: ${totalAvailableFromNode}, Need: ${unitsToMoveCount}`, 'ERROR', player);
                    } else {
                        const currentToNodeStandard = toNode.standardUnits || 0;
                        const currentToNodeEvolved = toNode.evolvedUnits || 0;
                        const totalUnitsAtToNodeAfterMove = currentToNodeStandard + currentToNodeEvolved + unitsToMoveCount;

                        if (toNode.maxUnits !== undefined && totalUnitsAtToNodeAfterMove > toNode.maxUnits) {
                            addSystemLog(`${player} failed to move units to ${toNode.label || toNodeId}: Move would exceed max units (${toNode.maxUnits}). Target has ${currentToNodeStandard + currentToNodeEvolved}, attempting to add ${unitsToMoveCount}.`, 'ERROR', player);
                        } else {
                            let standardUnitsMoved = Math.min(unitsToMoveCount, availableStandard);
                            let evolvedUnitsMoved = Math.min(unitsToMoveCount - standardUnitsMoved, availableEvolved);

                            currentPrev.mapNodes[fromNodeId].standardUnits -= standardUnitsMoved;
                            currentPrev.mapNodes[fromNodeId].evolvedUnits -= evolvedUnitsMoved;

                            currentPrev.mapNodes[toNodeId].standardUnits = (currentPrev.mapNodes[toNodeId].standardUnits || 0) + standardUnitsMoved;
                            currentPrev.mapNodes[toNodeId].evolvedUnits = (currentPrev.mapNodes[toNodeId].evolvedUnits || 0) + evolvedUnitsMoved;
                            
                            if (currentPrev.mapNodes[toNodeId].owner === 'NEUTRAL') {
                                currentPrev.mapNodes[toNodeId].owner = player;
                                addSystemLog(`${player} captured neutral node ${toNode.label || toNodeId} by moving ${unitsToMoveCount} units.`, 'AI_ACTION', player);
                            } else {
                                addSystemLog(`${player} moved ${unitsToMoveCount} units from ${fromNode.label || fromNodeId} to ${toNode.label || toNodeId}.`, 'AI_ACTION', player);
                            }
                        }
                    }
                }
            }
            else if (action.type === 'ACTIVATE_FABRICATION_HUB' && action.nodeId) {
                const targetNodeId = action.nodeId!;
                const targetNode = currentPrev.mapNodes[targetNodeId] as NoosphericNodeData | undefined;

                if (!targetNode) {
                    addSystemLog(`${player} failed to activate hub: Node ${targetNodeId} not found.`, 'ERROR', player);
                } else if (targetNode.owner !== player) {
                    addSystemLog(`${player} failed to activate hub at ${targetNode.label || targetNodeId}: Node not owned. Owner: ${targetNode.owner}`, 'ERROR', player);
                } else if (!targetNode.hasFabricationHub) {
                    addSystemLog(`${player} failed to activate hub at ${targetNode.label || targetNodeId}: Node does not have a fabrication hub.`, 'ERROR', player);
                } else if (targetNode.isHubActive) {
                    addSystemLog(`${player} failed to activate hub at ${targetNode.label || targetNodeId}: Hub is already active.`, 'ERROR', player);
                } else if (currentPrev.factions[player].qr < FAB_HUB_ACTIVATION_COST) {
                    addSystemLog(`${player} failed to activate hub at ${targetNode.label || targetNodeId}: Insufficient QR. Have: ${currentPrev.factions[player].qr}, Need: ${FAB_HUB_ACTIVATION_COST}`, 'ERROR', player);
                } else if (((targetNode.standardUnits || 0) + (targetNode.evolvedUnits || 0)) < FAB_HUB_GARRISON_MIN) {
                    addSystemLog(`${player} failed to activate hub at ${targetNode.label || targetNodeId}: Insufficient garrison. Have: ${((targetNode.standardUnits || 0) + (targetNode.evolvedUnits || 0))}, Need: ${FAB_HUB_GARRISON_MIN}`, 'ERROR', player);
                } else if (!isNodeConnectedToCN(targetNodeId, player, currentPrev.mapNodes)) {
                    addSystemLog(`${player} failed to activate hub at ${targetNode.label || targetNodeId}: Hub not connected to a Command Node.`, 'ERROR', player);
                } else {
                    currentPrev.mapNodes[targetNodeId].isHubActive = true;
                    currentPrev.mapNodes[targetNodeId].hubDisconnectedTurn = undefined; 
                    currentPrev.factions[player].qr -= FAB_HUB_ACTIVATION_COST;
                    addSystemLog(`${player} activated Fabrication Hub at ${targetNode.label || targetNodeId}.`, 'AI_ACTION', player);
                }
            }
            else if (action.type === 'EVOLVE_UNITS' && action.nodeId && action.unitsToEvolve) {
                const targetNodeId = action.nodeId!;
                const unitsToEvolveCount = action.unitsToEvolve!;
                const targetNode = currentPrev.mapNodes[targetNodeId] as NoosphericNodeData | undefined;
                const evolveCost = unitsToEvolveCount * EVOLVE_UNIT_COST;

                if (!targetNode) {
                    addSystemLog(`${player} failed to evolve units: Node ${targetNodeId} not found.`, 'ERROR', player);
                } else if (targetNode.owner !== player) {
                    addSystemLog(`${player} failed to evolve units at ${targetNode.label || targetNodeId}: Node not owned. Owner: ${targetNode.owner}`, 'ERROR', player);
                } else if (!targetNode.hasFabricationHub || !targetNode.isHubActive) {
                    addSystemLog(`${player} failed to evolve units at ${targetNode.label || targetNodeId}: Hub not present or not active.`, 'ERROR', player);
                } else if (currentPrev.factions[player].qr < evolveCost) {
                    addSystemLog(`${player} failed to evolve units at ${targetNode.label || targetNodeId}: Insufficient QR. Have: ${currentPrev.factions[player].qr}, Need: ${evolveCost}`, 'ERROR', player);
                } else if ((targetNode.standardUnits || 0) < unitsToEvolveCount) {
                    addSystemLog(`${player} failed to evolve units at ${targetNode.label || targetNodeId}: Insufficient standard units. Have: ${(targetNode.standardUnits || 0)}, Need: ${unitsToEvolveCount}`, 'ERROR', player);
                } else if (!isNodeConnectedToCN(targetNodeId, player, currentPrev.mapNodes)) {
                    addSystemLog(`${player} failed to evolve units at ${targetNode.label || targetNodeId}: Hub not connected to a Command Node.`, 'ERROR', player);
                } else {
                    currentPrev.mapNodes[targetNodeId].standardUnits = (currentPrev.mapNodes[targetNodeId].standardUnits || 0) - unitsToEvolveCount;
                    currentPrev.mapNodes[targetNodeId].evolvedUnits = (currentPrev.mapNodes[targetNodeId].evolvedUnits || 0) + unitsToEvolveCount;
                    currentPrev.factions[player].qr -= evolveCost;
                    addSystemLog(`${player} evolved ${unitsToEvolveCount} units at ${targetNode.label || targetNodeId}.`, 'AI_ACTION', player);
                }
            }
           else if (action.type === 'ATTACK_NODE' && action.fromNodeId && action.toNodeId && action.units) {
                const attackerNode = currentPrev.mapNodes[action.fromNodeId!] as NoosphericNodeData | undefined;
                const defenderNode = currentPrev.mapNodes[action.toNodeId!] as NoosphericNodeData | undefined;
                
                if (!attackerNode) {
                     addSystemLog(`${player} failed to attack: Source node ${action.fromNodeId} not found.`, 'ERROR', player);
                     return; 
                }
                if (!defenderNode) {
                     addSystemLog(`${player} failed to attack: Target node ${action.toNodeId} not found.`, 'ERROR', player);
                     return; 
                }

                const totalAttackingUnitsRequest = action.units!;
                const attackerSourceInitialStandard = attackerNode.standardUnits || 0;
                const attackerSourceInitialEvolved = attackerNode.evolvedUnits || 0;
                const attackerSourceTotal = attackerSourceInitialStandard + attackerSourceInitialEvolved;

                if (attackerNode && defenderNode && attackerNode.owner === player && attackerSourceTotal >= totalAttackingUnitsRequest && defenderNode.owner !== player && attackerNode.connections.includes(action.toNodeId!)) {
                    const defenderPlayerId = defenderNode.owner;
                    const defenderInitialStandardUnits = defenderNode.standardUnits || 0;
                    const defenderInitialEvolvedUnits = defenderNode.evolvedUnits || 0;
                    const defenderInitialTotalUnits = defenderInitialStandardUnits + defenderInitialEvolvedUnits;

                    let committedStandardFromSource = Math.min(totalAttackingUnitsRequest, attackerSourceInitialStandard);
                    let committedEvolvedFromSource = Math.min(totalAttackingUnitsRequest - committedStandardFromSource, attackerSourceInitialEvolved);

                    currentPrev.mapNodes[action.fromNodeId!].standardUnits = attackerSourceInitialStandard - committedStandardFromSource;
                    currentPrev.mapNodes[action.fromNodeId!].evolvedUnits = attackerSourceInitialEvolved - committedEvolvedFromSource;

                    let attackingStandardUnitsInBattle = committedStandardFromSource;
                    let attackingEvolvedUnitsInBattle = committedEvolvedFromSource;
                    let currentAttackerTotalForCombat = attackingStandardUnitsInBattle + attackingEvolvedUnitsInBattle;

                    let currentDefenderStandardUnits = defenderInitialStandardUnits;
                    let currentDefenderEvolvedUnits = defenderInitialEvolvedUnits;
                    let totalAttackerLossesInBattle = 0;
                    let totalDefenderLosses = 0;
                    const diceRollsDetails: DiceRollDetail[] = [];

                    const attackerHadEvolvedInBattle = attackingEvolvedUnitsInBattle > 0;
                    const defenderHadEvolvedInBattle = defenderInitialEvolvedUnits > 0;

                    if (defenderInitialTotalUnits === 0 && defenderPlayerId === 'NEUTRAL') {
                        diceRollsDetails.push({ attackerRoll: 'N/A', defenderRoll: 'N/A', outcome: 'Attacker auto-captures empty neutral node', attackerUnitsRemaining: currentAttackerTotalForCombat, defenderUnitsRemaining: 0 });
                    } else {
                        let tempDefenderTotal = defenderInitialTotalUnits;
                        let tempAttackerTotalInBattle = currentAttackerTotalForCombat;

                        while(tempAttackerTotalInBattle > 0 && tempDefenderTotal > 0) {
                            let attackerRollValue = 1 + Math.floor(Math.random() * 6) + (attackerHadEvolvedInBattle ? EVOLVED_UNIT_COMBAT_BONUS : 0);
                            let defenderRollValue = 1 + Math.floor(Math.random() * 6) + (defenderHadEvolvedInBattle ? EVOLVED_UNIT_COMBAT_BONUS : 0);

                            let roundOutcome = "";

                            if (attackerRollValue > defenderRollValue) {
                                tempDefenderTotal--;
                                totalDefenderLosses++;
                                roundOutcome = `Attacker Hits (Defender loses 1 unit)`;
                            } else if (defenderRollValue > attackerRollValue) {
                                tempAttackerTotalInBattle--;
                                totalAttackerLossesInBattle++;
                                roundOutcome = `Defender Hits (Attacker loses 1 unit)`;
                            } else {
                                roundOutcome = "Clash (No losses this roll)";
                            }
                            diceRollsDetails.push({
                                attackerRoll: attackerRollValue, defenderRoll: defenderRollValue, outcome: roundOutcome,
                                attackerUnitsRemaining: tempAttackerTotalInBattle, defenderUnitsRemaining: tempDefenderTotal,
                                attackerHadEvolved: attackerHadEvolvedInBattle,
                                defenderHadEvolved: defenderHadEvolvedInBattle
                            });
                        }
                        currentAttackerTotalForCombat = tempAttackerTotalInBattle;

                        let remainingDefenderLosses = totalDefenderLosses;
                        const standardDefenderLossesApplied = Math.min(remainingDefenderLosses, defenderInitialStandardUnits);
                        currentDefenderStandardUnits = defenderInitialStandardUnits - standardDefenderLossesApplied;
                        remainingDefenderLosses -= standardDefenderLossesApplied;
                        currentDefenderEvolvedUnits = Math.max(0, defenderInitialEvolvedUnits - remainingDefenderLosses);
                    }

                    const battleOutcome: BattleLogEntry['outcome'] = currentAttackerTotalForCombat > 0 ? 'ATTACKER_WINS' : 'DEFENDER_WINS';
                    const nodeCaptured = battleOutcome === 'ATTACKER_WINS';

                    let survivingStandardAttackers = Math.max(0, attackingStandardUnitsInBattle - Math.min(totalAttackerLossesInBattle, attackingStandardUnitsInBattle));
                    let survivingEvolvedAttackers = Math.max(0, attackingEvolvedUnitsInBattle - Math.max(0, totalAttackerLossesInBattle - Math.min(totalAttackerLossesInBattle, attackingStandardUnitsInBattle)));

                    if (nodeCaptured) {
                        currentPrev.mapNodes[action.toNodeId!] = {
                            ...defenderNode,
                            owner: player,
                            standardUnits: survivingStandardAttackers,
                            evolvedUnits: survivingEvolvedAttackers,
                            isHubActive: false,
                            hubDisconnectedTurn: undefined
                        };
                    } else {
                        currentPrev.mapNodes[action.toNodeId!] = { ...defenderNode, standardUnits: currentDefenderStandardUnits, evolvedUnits: currentDefenderEvolvedUnits };
                    }

                    addBattleLog({
                        turn: currentPrev.turn,
                        attacker: player,
                        defender: defenderPlayerId,
                        fromNodeId: action.fromNodeId,
                        nodeId: action.toNodeId!,
                        outcome: battleOutcome,
                        attackerLosses: totalAttackerLossesInBattle,
                        defenderLosses: totalDefenderLosses,
                        nodeCaptured,
                        attackerInitialUnits: totalAttackingUnitsRequest,
                        defenderInitialUnits: defenderInitialTotalUnits,
                        diceRolls: diceRollsDetails,
                        nodeName: defenderNode.regionName,
                        unitsRemainingAtNode: (currentPrev.mapNodes[action.toNodeId!].standardUnits || 0) + (currentPrev.mapNodes[action.toNodeId!].evolvedUnits || 0)
                    });
                } else {
                    addSystemLog(`${player} failed to attack ${defenderNode?.label || action.toNodeId} from ${attackerNode?.label || action.fromNodeId}: Invalid setup or target. Source Units: ${attackerSourceTotal}, Requested: ${totalAttackingUnitsRequest}`, 'ERROR', player);
                }
            }
        });
        
        currentPrev.factions[player].aiError = undefined;

        const newAnalysisEntry: TacticalAnalysisEntry = {
          turn: currentPrev.turn,
          phase: currentPrev.currentPhase,
          analysis: aiResponse.tacticalAnalysis,
        };
        currentPrev.factions[player].tacticalAnalysisHistory = [
          ...currentPrev.factions[player].tacticalAnalysisHistory,
          newAnalysisEntry
        ].slice(-50);
        return currentPrev;
    });

  }, [addSystemLog, addBattleLog, isNodeConnectedToCN]);

  const advancePhase = useCallback(() => {
    if (gameStateRef.current.isPaused) {
        return;
    }
    setGameState(prev => {
      if (gameIsOverRef.current || prev.isPaused) {
          return prev;
      }
      let nextPhase: NoosphericPhase = prev.currentPhase;
      let nextTurn = prev.turn;
      let nextActivePlayer = prev.activePlayer;
      let updatedState = { ...prev, mapNodes: { ...prev.mapNodes}, factions: {...prev.factions, 'GEM-Q': {...prev.factions['GEM-Q']}, 'AXIOM': {...prev.factions['AXIOM']}} };

      phaseStartTimestampRef.current = Date.now();
      elapsedPhaseTimeBeforePauseRef.current = 0;
      setCurrentPhaseTimeMs(0); 

      switch (prev.currentPhase) {
        case 'FLUCTUATION':
            updatedState = handleFluctuationEvent(updatedState, nextTurn);
            nextPhase = 'RESOURCE';
            addSystemLog(`Advancing to RESOURCE Phase.`, "EVENT", undefined, nextTurn, nextPhase);
            break;
        case 'RESOURCE':
             Object.values(updatedState.mapNodes).forEach(nodeUnknown => {
                const node = nodeUnknown as NoosphericNodeData;
                if (node.owner !== 'NEUTRAL' && isNodeConnectedToCN(node.id, node.owner, updatedState.mapNodes)) {
                   updatedState.factions[node.owner].qr += node.qrOutput;
                }
             });
             addSystemLog(`QR collected. GEM-Q: ${updatedState.factions['GEM-Q'].qr}, AXIOM: ${updatedState.factions['AXIOM'].qr}.`, "EVENT", undefined, nextTurn, 'RESOURCE');
             nextPhase = 'MANEUVER';
             nextActivePlayer = 'GEM-Q';
             addSystemLog(`Advancing to MANEUVER Phase. ${AI1_NAME} to act.`, "EVENT", undefined, nextTurn, nextPhase);
             break;
        case 'MANEUVER':
            if (prev.activePlayer === 'GEM-Q') {
                addSystemLog(`${AI1_NAME} maneuver actions processed.`, "EVENT", undefined, prev.turn, 'MANEUVER');
                nextActivePlayer = 'AXIOM';
                addSystemLog(`${AI2_NAME} to perform maneuver actions.`, "EVENT", undefined, prev.turn, 'MANEUVER');
            } else { 
                addSystemLog(`${AI2_NAME} maneuver actions processed.`, "EVENT", undefined, prev.turn, 'MANEUVER');
                nextPhase = 'COMBAT';
                nextActivePlayer = 'GEM-Q';
                addSystemLog(`Advancing to COMBAT Phase. ${AI1_NAME} to act.`, "EVENT", undefined, prev.turn, nextPhase);
            }
            break;
        case 'COMBAT':
            if (prev.activePlayer === 'GEM-Q') {
                addSystemLog(`${AI1_NAME} combat actions processed.`, "EVENT", undefined, prev.turn, 'COMBAT');
                nextActivePlayer = 'AXIOM';
                addSystemLog(`${AI2_NAME} to perform combat actions.`, "EVENT", undefined, prev.turn, 'COMBAT');
            }
            else { 
                addSystemLog(`AXIOM combat actions processed. End of Turn ${prev.turn}.`, "EVENT", undefined, prev.turn, 'COMBAT');

                if (currentTurnStartTimestampRef.current) {
                    const fullTurnDuration = Date.now() - currentTurnStartTimestampRef.current;
                    allFullTurnDurationsMsRef.current.push(fullTurnDuration);
                    completedFullTurnsRef.current += 1;
                }
                currentTurnStartTimestampRef.current = Date.now(); 

                (['GEM-Q', 'AXIOM'] as NoosphericPlayerId[]).forEach(playerId => {
                    updatedState.factions[playerId].totalUnits = 0;
                    updatedState.factions[playerId].totalStandardUnits = 0;
                    updatedState.factions[playerId].totalEvolvedUnits = 0;
                    updatedState.factions[playerId].nodesControlled = 0;
                    updatedState.factions[playerId].kjsHeld = 0;
                    updatedState.factions[playerId].activeHubsCount = 0;
                    Object.values(updatedState.mapNodes).forEach(nodeUnknown => {
                        const node = nodeUnknown as NoosphericNodeData;
                        if (node.owner === playerId) {
                            updatedState.factions[playerId].nodesControlled++;
                            updatedState.factions[playerId].totalStandardUnits += node.standardUnits || 0;
                            updatedState.factions[playerId].totalEvolvedUnits += node.evolvedUnits || 0;
                            if (node.isKJ && isNodeConnectedToCN(node.id, playerId, updatedState.mapNodes)) {
                                updatedState.factions[playerId].kjsHeld++;
                            }
                            if (node.hasFabricationHub && node.isHubActive && isNodeConnectedToCN(node.id, playerId, updatedState.mapNodes)) {
                                updatedState.factions[playerId].activeHubsCount++;
                            } else if (node.hasFabricationHub && node.isHubActive && !isNodeConnectedToCN(node.id, playerId, updatedState.mapNodes)) {
                                if (node.hubDisconnectedTurn === undefined) {
                                    updatedState.mapNodes[node.id].hubDisconnectedTurn = prev.turn;
                                } else if (prev.turn > node.hubDisconnectedTurn) {
                                    updatedState.mapNodes[node.id].isHubActive = false;
                                    updatedState.mapNodes[node.id].hubDisconnectedTurn = undefined;
                                    addSystemLog(`Fabrication Hub at ${node.label} (${playerId}) deactivated due to lost CN connection.`, "EVENT", playerId);
                                }
                            } else if (node.hasFabricationHub && !node.isHubActive) {
                                updatedState.mapNodes[node.id].hubDisconnectedTurn = undefined;
                            }
                        }
                    });
                    updatedState.factions[playerId].totalUnits = updatedState.factions[playerId].totalStandardUnits + updatedState.factions[playerId].totalEvolvedUnits;
                });


                if (updatedState.isGreatWarMode) {
                    const gemQHasUnits = updatedState.factions['GEM-Q'].totalUnits > 0;
                    const gemQHasCNs = Object.values(updatedState.mapNodes).some(nUnk => { const n = nUnk as NoosphericNodeData; return n.owner === 'GEM-Q' && n.isCN; });
                    const gemQCanDeploy = updatedState.factions['GEM-Q'].qr >= DEPLOY_STANDARD_UNIT_COST;

                    const axiomHasUnits = updatedState.factions['AXIOM'].totalUnits > 0;
                    const axiomHasCNs = Object.values(updatedState.mapNodes).some(nUnk => { const n = nUnk as NoosphericNodeData; return n.owner === 'AXIOM' && n.isCN; });
                    const axiomCanDeploy = updatedState.factions['AXIOM'].qr >= DEPLOY_STANDARD_UNIT_COST;

                    const gemQLoses = (!gemQHasUnits && !gemQCanDeploy) || !gemQHasCNs;
                    const axiomLoses = (!axiomHasUnits && !axiomCanDeploy) || !axiomHasCNs;

                    if (gemQLoses && axiomLoses) {
                        if (updatedState.winner === undefined) {
                            updatedState.winner = 'DRAW'; nextPhase = 'GAME_OVER';
                            addSystemLog(`Mutual Annihilation! The Great War ends in a stalemate.`, "EVENT", undefined, prev.turn, 'GAME_OVER');
                        }
                    } else if (gemQLoses) {
                         if (updatedState.winner === undefined) {
                            updatedState.winner = 'AXIOM'; nextPhase = 'GAME_OVER';
                            addSystemLog(`GEM-Q has been eliminated. AXIOM is victorious in The Great War!`, "EVENT", undefined, prev.turn, 'GAME_OVER');
                        }
                    } else if (axiomLoses) {
                        if (updatedState.winner === undefined) {
                            updatedState.winner = 'GEM-Q'; nextPhase = 'GAME_OVER';
                            addSystemLog(`AXIOM has been eliminated. GEM-Q is victorious in The Great War!`, "EVENT", undefined, prev.turn, 'GAME_OVER');
                        }
                    }
                } else {
                    const kjVictoryTurns = updatedState.mapType === "Fractured Core" ? 3 : 2;
                    const kjsNeededForVictory = updatedState.mapType === "Fractured Core" ? 4 : 2;

                    const gemQKJsConnected = Object.values(updatedState.mapNodes).filter(nUnk => { const n = nUnk as NoosphericNodeData; return n.owner === 'GEM-Q' && n.isKJ && isNodeConnectedToCN(n.id, 'GEM-Q', updatedState.mapNodes); }).length;
                    const axiomKJsConnected = Object.values(updatedState.mapNodes).filter(nUnk => { const n = nUnk as NoosphericNodeData; return n.owner === 'AXIOM' && n.isKJ && isNodeConnectedToCN(n.id, 'AXIOM', updatedState.mapNodes); }).length;

                    if (gemQKJsConnected >= kjsNeededForVictory) kjControlStreakRef.current['GEM-Q']++; else kjControlStreakRef.current['GEM-Q'] = 0;
                    if (axiomKJsConnected >= kjsNeededForVictory) kjControlStreakRef.current['AXIOM']++; else kjControlStreakRef.current['AXIOM'] = 0;

                    if (kjControlStreakRef.current['GEM-Q'] >= kjVictoryTurns && updatedState.winner === undefined) {
                        updatedState.winner = 'GEM-Q'; nextPhase = 'GAME_OVER';
                        addSystemLog(`${AI1_NAME} achieves Noospheric Supremacy by KJ control!`, "EVENT", undefined, prev.turn, 'GAME_OVER');
                    } else if (kjControlStreakRef.current['AXIOM'] >= kjVictoryTurns && updatedState.winner === undefined) {
                        updatedState.winner = 'AXIOM'; nextPhase = 'GAME_OVER';
                        addSystemLog(`${AI2_NAME} achieves Noospheric Supremacy by KJ control!`, "EVENT", undefined, prev.turn, 'GAME_OVER');
                    }
                }

                if (nextPhase !== 'GAME_OVER' && prev.turn >= DEFAULT_MAX_TURNS && updatedState.winner === undefined) {
                    if (!updatedState.isGreatWarMode) {
                        const gemQScore = updatedState.factions['GEM-Q'].qr + updatedState.factions['GEM-Q'].nodesControlled * 2 + updatedState.factions['GEM-Q'].kjsHeld * 5 + updatedState.factions['GEM-Q'].totalUnits;
                        const axiomScore = updatedState.factions['AXIOM'].qr + updatedState.factions['AXIOM'].nodesControlled * 2 + updatedState.factions['AXIOM'].kjsHeld * 5 + updatedState.factions['AXIOM'].totalUnits;
                        if (gemQScore > axiomScore) updatedState.winner = 'GEM-Q';
                        else if (axiomScore > gemQScore) updatedState.winner = 'AXIOM';
                        else updatedState.winner = 'DRAW';
                        nextPhase = 'GAME_OVER';
                        addSystemLog(`Max turns (${DEFAULT_MAX_TURNS}) reached. Winner by score: ${updatedState.winner}. GEM-Q: ${gemQScore}, AXIOM: ${axiomScore}`, "EVENT", undefined, prev.turn, 'GAME_OVER');
                    } else {
                         updatedState.winner = 'DRAW';
                         nextPhase = 'GAME_OVER';
                         addSystemLog(`Max turns (${DEFAULT_MAX_TURNS}) reached in Great War. Game ends in a Stalemate.`, "EVENT", undefined, prev.turn, 'GAME_OVER');
                    }
                }

                if (nextPhase !== 'GAME_OVER') {
                    nextTurn = prev.turn + 1;
                    nextPhase = 'FLUCTUATION';
                    nextActivePlayer = 'GEM-Q';
                    addSystemLog(`Advancing to Turn ${nextTurn}, FLUCTUATION Phase.`, "EVENT", undefined, nextTurn, nextPhase);
                }
            }
            break;
        case 'GAME_OVER':
            return prev;
      }
      if (updatedState.winner && updatedState.currentPhase !== 'GAME_OVER') {
          nextPhase = 'GAME_OVER';
      }
      return { ...updatedState, currentPhase: nextPhase, turn: nextTurn, activePlayer: nextActivePlayer };
    });
  }, [addSystemLog, handleFluctuationEvent, isNodeConnectedToCN]); 


  const makeAIMove = useCallback(async () => {
    if (gameStateRef.current.isPaused || isEmergencyStopActive) {
        setIsLoadingAI(null);
        if(isEmergencyStopActive) addSystemLog('AI move halted due to Emergency Stop.', 'ERROR', gameStateRef.current.activePlayer);
        return;
    }

    const currentPhaseSnapshot = gameStateRef.current.currentPhase;
    const activePlayerSnapshot = gameStateRef.current.activePlayer;
    const isFogOfWarCurrentlyActive = gameStateRef.current.isFogOfWarActive;
    const isGreatWarActive = gameStateRef.current.isGreatWarMode;
    let currentPlayerId = activePlayerSnapshot; 

    if (apiKeyMissing || gameIsOverRef.current || !isOverallAiReady || currentPhaseSnapshot === 'GAME_OVER') {
        advancePhase(); 
        return;
    }
    if (currentPhaseSnapshot !== 'MANEUVER' && currentPhaseSnapshot !== 'COMBAT') {
        setIsLoadingAI(null);
        advancePhase(); 
        return;
    }
    const currentAiChat = currentPlayerId === 'GEM-Q' ? ai1Chat : ai2Chat;
    if (!currentAiChat) {
        addSystemLog(`${currentPlayerId} AI chat not available. Game cannot proceed.`, 'ERROR', currentPlayerId);
        setIsLoadingAI(null);
        advancePhase(); 
        return;
    }

    let aiResponseProcessedSuccessfully = false;
    let lastValidationError: string | null = null;

    try {
        setIsLoadingAI(currentPlayerId);
        aiTurnStartTimeRef.current = Date.now();
        elapsedIndividualAiTurnTimeBeforePauseRef.current = 0;

        setGameState(prev => ({
            ...prev,
            factions: { ...prev.factions, [currentPlayerId]: { ...prev.factions[currentPlayerId], aiError: undefined }}
        }));

        let visibleMapNodes: Record<string, NoosphericNodeData> = JSON.parse(JSON.stringify(gameStateRef.current.mapNodes));
        let visibleFactionsData = JSON.parse(JSON.stringify(gameStateRef.current.factions));

        if (isFogOfWarCurrentlyActive) {
            Object.keys(visibleMapNodes).forEach(nodeId => {
                const node = visibleMapNodes[nodeId] as NoosphericNodeData;
                const isOwnedByCurrentPlayer = node.owner === currentPlayerId;
                const isAdjacentToOwned = node.connections.some(connId => (visibleMapNodes[connId] as NoosphericNodeData)?.owner === currentPlayerId);

                if (!isOwnedByCurrentPlayer && !isAdjacentToOwned) {
                    delete visibleMapNodes[nodeId];
                } else if (!isOwnedByCurrentPlayer && isAdjacentToOwned) {
                    visibleMapNodes[nodeId] = {
                        ...node,
                        owner: 'UNKNOWN' as NoosphericPlayerId,
                        standardUnits: -1, evolvedUnits: -1, isHubActive: false, hubDisconnectedTurn: undefined
                    };
                }
            });
            const opponentId = currentPlayerId === 'GEM-Q' ? 'AXIOM' : 'GEM-Q';
            visibleFactionsData[opponentId] = {
                ...visibleFactionsData[opponentId],
                qr: -1, nodesControlled: -1, totalUnits: -1, totalStandardUnits: -1, totalEvolvedUnits: -1, kjsHeld: -1, activeHubsCount: -1, tacticalAnalysis: "Opponent strategy unknown due to Fog of War."
            };
        }

        // --- THE FIX: Prune the history before sending it to the AI ---
        const PRUNED_HISTORY_LENGTH = 3; // Keep only the last 3 analyses

        const prunedFactionsData = JSON.parse(JSON.stringify(visibleFactionsData)); // Deep copy to avoid mutating state
        if (prunedFactionsData[currentPlayerId]?.tacticalAnalysisHistory) {
            prunedFactionsData[currentPlayerId].tacticalAnalysisHistory = 
                prunedFactionsData[currentPlayerId].tacticalAnalysisHistory.slice(-PRUNED_HISTORY_LENGTH);
        }
        // --- END OF FIX ---

        const basePromptGameState = {
            currentTurn: gameStateRef.current.turn,
            currentPhase: currentPhaseSnapshot,
            yourFactionId: currentPlayerId,
            mapNodes: visibleMapNodes,
            mapType: gameStateRef.current.mapType,
            isFogOfWarActive: isFogOfWarCurrentlyActive,
            isGreatWarMode: isGreatWarActive,
            factions: prunedFactionsData, // Use the pruned data
        };
        let basePromptString = `Current Game State:\n${JSON.stringify(basePromptGameState, null, 2)}\n\nYour turn (${currentPlayerId}) for phase ${currentPhaseSnapshot}. Provide JSON response.`;
        if (isGreatWarActive) basePromptString += GREAT_WAR_AI_SYSTEM_PROMPT_ADDENDUM;

        for (let attempt = 0; attempt <= MAX_NOOSPHERIC_RETRY_ATTEMPTS; attempt++) {
            if (gameStateRef.current.isPaused || isEmergencyStopActive) break;

            let promptForAI = basePromptString;
            if (attempt > 0 && lastValidationError) {
                promptForAI += `\n\nATTENTION: Your previous attempt (Attempt ${attempt}) was invalid. Error: "${lastValidationError}". Retry attempt ${attempt + 1}/${MAX_NOOSPHERIC_RETRY_ATTEMPTS + 1}.`;
                addSystemLog(`${currentPlayerId} (Attempt ${attempt + 1}) Retrying. Prev Error: ${lastValidationError.substring(0, 80)}...`, 'INFO', currentPlayerId);
            }
            if (attempt === 0) {
                 addSystemLog(`${currentPlayerId} is thinking for ${currentPhaseSnapshot} phase... Prompt length: ${promptForAI.length}`, 'INFO', currentPlayerId);
            }

            try {
                if (gameStateRef.current.isPaused || isEmergencyStopActive) break;

                const timeoutPromise = new Promise<GenerateContentResponse>((_, reject) => 
                    setTimeout(() => reject(new Error(`AI response timeout after ${AI_RESPONSE_TIMEOUT_MS / 1000}s`)), AI_RESPONSE_TIMEOUT_MS)
                );
                const responsePromise = currentAiChat.sendMessage({ message: promptForAI });
                
                const response: GenerateContentResponse = await Promise.race([responsePromise, timeoutPromise]);

                if (gameStateRef.current.isPaused || isEmergencyStopActive) break;
                
                let aiResponseText = response.text.trim();

                const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
                const match = aiResponseText.match(fenceRegex);
                if (match && match[2]) aiResponseText = match[2].trim();

                const parsedResponseCandidate = JSON.parse(aiResponseText);

                if (isGreatWarActive && parsedResponseCandidate.actions?.[0]?.type === "SURRENDER") {
                    const surrenderAction = parsedResponseCandidate.actions[0];
                    const reason = surrenderAction.reason || "No reason.";
                    const opponent = currentPlayerId === 'GEM-Q' ? 'AXIOM' : 'GEM-Q';
                    addSystemLog(`${currentPlayerId} surrenders! Reason: ${reason}. Tactical Analysis: ${parsedResponseCandidate.tacticalAnalysis || 'N/A'}`, "EVENT", currentPlayerId);
                    setGameState(prev => ({...prev, winner: opponent, currentPhase: 'GAME_OVER'}));
                    aiResponseProcessedSuccessfully = true; break;
                }

                const parsedResponse: NoosphericAIResponse = parsedResponseCandidate as NoosphericAIResponse;
                let currentAttemptIsValid = true; lastValidationError = null;

                if (!parsedResponse || !parsedResponse.actions || !Array.isArray(parsedResponse.actions) || typeof parsedResponse.tacticalAnalysis !== 'string') {
                    currentAttemptIsValid = false; lastValidationError = "Invalid JSON structure: 'actions' array or 'tacticalAnalysis' string missing.";
                } else {
                    for (const action of parsedResponse.actions) {
                        if (!action.type) { currentAttemptIsValid = false; lastValidationError = `Action missing 'type'.`; break; }
                        if ((action.type === 'DEPLOY_UNITS' || action.type === 'MOVE_UNITS' || action.type === 'ATTACK_NODE') && (action.units === undefined || action.units <= 0)) {
                            currentAttemptIsValid = false; lastValidationError = `Action ${action.type} requires positive 'units'. Received: ${action.units}.`; break;
                        }
                        if (action.type === 'EVOLVE_UNITS' && (action.unitsToEvolve === undefined || action.unitsToEvolve <= 0)) {
                            currentAttemptIsValid = false; lastValidationError = `Action ${action.type} requires positive 'unitsToEvolve'. Received: ${action.unitsToEvolve}.`; break;
                        }
                        if (['DEPLOY_UNITS', 'ACTIVATE_FABRICATION_HUB', 'EVOLVE_UNITS'].includes(action.type) && typeof action.nodeId !== 'string') {
                           currentAttemptIsValid = false; lastValidationError = `Action ${action.type} requires a string 'nodeId'. Received: ${typeof action.nodeId}.`; break;
                        }
                        if (['MOVE_UNITS', 'ATTACK_NODE'].includes(action.type) && (typeof action.fromNodeId !== 'string' || typeof action.toNodeId !== 'string')) {
                           currentAttemptIsValid = false; lastValidationError = `Action ${action.type} requires string 'fromNodeId' and 'toNodeId'. Received from: ${typeof action.fromNodeId}, to: ${typeof action.toNodeId}.`; break;
                        }
                    }
                }

                if (currentAttemptIsValid) {
                    addSystemLog(`${currentPlayerId} tactical analysis: ${parsedResponse.tacticalAnalysis}`, 'AI_ACTION', currentPlayerId);
                    processAIResponse(parsedResponse, currentPlayerId);
                    aiResponseProcessedSuccessfully = true;
                    setGameState(prev => ({...prev, factions: {...prev.factions, [currentPlayerId]: {...prev.factions[currentPlayerId], successfulTurnAttempts: (prev.factions[currentPlayerId].successfulTurnAttempts || 0) + 1 }}}));
                    break; 
                } else {
                    addSystemLog(`${currentPlayerId} invalid response (Attempt ${attempt + 1}): ${lastValidationError}`, 'ERROR', currentPlayerId);
                }
            } catch (apiOrParseError: any) {
                if (gameStateRef.current.isPaused || isEmergencyStopActive) break;
                lastValidationError = `Error parsing AI response or API error: ${apiOrParseError.message}`;
                if (apiOrParseError.message.includes("timeout")) {
                    lastValidationError = `AI Response Timeout (${AI_RESPONSE_TIMEOUT_MS / 1000}s).`;
                }
                addSystemLog(`${currentPlayerId} error (Attempt ${attempt + 1}): ${lastValidationError}`, 'ERROR', currentPlayerId);
            }
        } 

        if (!aiResponseProcessedSuccessfully && !gameIsOverRef.current && !gameStateRef.current.isPaused && !isEmergencyStopActive) {
            addSystemLog(`${currentPlayerId} failed all attempts. Turn skipped. Final Error: ${lastValidationError || 'Unknown'}`, 'ERROR', currentPlayerId);
            setGameState(prev => ({
                ...prev,
                factions: { ...prev.factions, [currentPlayerId]: { ...prev.factions[currentPlayerId], aiError: lastValidationError || 'Failed all attempts.', failedTurnAttempts: (prev.factions[currentPlayerId].failedTurnAttempts || 0) + 1 }}
            }));
        }
    } catch (mainError: any) { 
        addSystemLog(`${currentPlayerId} critical error during move execution: ${mainError.message}`, 'ERROR', currentPlayerId);
    } finally {
        if (aiTurnStartTimeRef.current) {
            const duration = elapsedIndividualAiTurnTimeBeforePauseRef.current + (Date.now() - aiTurnStartTimeRef.current);
            lastTurnDurationMsRef.current = duration;
            setLastAiProcessingTimeDisplay(formatDuration(duration));
        }
        aiTurnStartTimeRef.current = null; 
        elapsedIndividualAiTurnTimeBeforePauseRef.current = 0;

        setIsLoadingAI(null);
        if (!gameIsOverRef.current && !gameStateRef.current.isPaused && !isEmergencyStopActive) {
            advancePhase();
        }
    }
  }, [apiKeyMissing, isOverallAiReady, ai1Chat, ai2Chat, addSystemLog, processAIResponse, advancePhase, isNodeConnectedToCN, isEmergencyStopActive, formatDuration]);


  // --- FINAL, ROBUST requestAnimationFrame-based GAME LOOP ---
  useEffect(() => {
    // This hook establishes a resilient game loop using requestAnimationFrame,
    // which is more robust against browser throttling than setTimeout.
    
    const gameLoop = () => {
        // Immediately schedule the next frame to create a continuous loop
        gameLoopIdRef.current = requestAnimationFrame(gameLoop);

        // Pre-condition checks: If we shouldn't proceed, just exit this frame's logic.
        const canProceed = isGameStarted && isOverallAiReady && !gameStateRef.current.isPaused && !isLoadingAI && !gameIsOverRef.current && !isEmergencyStopActive;
        if (!canProceed) {
            // Reset the timer when the loop is effectively paused to avoid a large jump when it resumes.
            lastTickTimestampRef.current = Date.now();
            timeSinceLastActionRef.current = 0;
            return;
        }

        const now = Date.now();
        const deltaTime = now - lastTickTimestampRef.current;
        lastTickTimestampRef.current = now;
        timeSinceLastActionRef.current += deltaTime;

        const currentPhase = gameStateRef.current.currentPhase;
        
        // Determine the action delay for the current phase
        const actionDelay = (currentPhase === 'MANEUVER' || currentPhase === 'COMBAT') 
            ? AI_DECISION_DELAY_MS 
            : PHASE_ADVANCE_DELAY_MS;

        // Check if enough time has passed to perform the next action
        if (timeSinceLastActionRef.current >= actionDelay) {
            timeSinceLastActionRef.current = 0; // Reset the timer

            if (currentPhase === 'FLUCTUATION' || currentPhase === 'RESOURCE') {
                // For automatic phases, advance the state immediately.
                advancePhase();
            } else if (currentPhase === 'MANEUVER' || currentPhase === 'COMBAT') {
                // For AI-driven phases, call the makeAIMove function.
                // This will set isLoadingAI = true, which will pause this loop on the next frame.
                makeAIMove();
            }
        }
    };

    // Start the loop.
    gameLoopIdRef.current = requestAnimationFrame(gameLoop);

    // Cleanup function: This is crucial to stop the loop when the component unmounts.
    return () => {
        cancelAnimationFrame(gameLoopIdRef.current);
    };

  }, [isGameStarted, isOverallAiReady, gameState.isPaused, isLoadingAI, advancePhase, makeAIMove, isEmergencyStopActive]);


  useEffect(() => {
    if (propInitialGameState && propIsGameStartedFromBackup) {
      setGameState(propInitialGameState);
      setCurrentMapTypeInternal(propInitialGameState.mapType);
      setActiveModifiers(prev => ({
        ...prev,
        isFogOfWarActive: propInitialGameState.isFogOfWarActive,
        isGreatWarMode: propInitialGameState.isGreatWarMode ?? false,
      }));
      setIsGameStarted(true);
      
      gameStartTimestampRef.current = Date.now(); 
      phaseStartTimestampRef.current = Date.now();
      currentTurnStartTimestampRef.current = Date.now();
      elapsedGameTimeBeforePauseRef.current = 0;
      elapsedPhaseTimeBeforePauseRef.current = 0;
      
      setTotalGameTimeMs(0);
      setCurrentPhaseTimeMs(0);
      setTotalGameTimeDisplay(formatDuration(0));
      setCurrentPhaseTimeDisplay(formatDuration(0));
      setAverageFullTurnTimeDisplay(formatDuration(0));
      setLastAiProcessingTimeDisplay(formatDuration(0));
      allFullTurnDurationsMsRef.current = [];
      completedFullTurnsRef.current = 0;
      lastTurnDurationMsRef.current = 0;

    }
  }, [propInitialGameState, propIsGameStartedFromBackup, formatDuration]);

 useEffect(() => {
    let animationFrameId: number;
    const updateDisplaysLogic = () => {
      if (!isMountedRef.current) return;
      
      const now = Date.now();
      let currentTotalGameMs = totalGameTimeMs;
      let currentPhaseMs = currentPhaseTimeMs;

      if (isGameStarted && !gameStateRef.current.isPaused && gameStateRef.current.currentPhase !== 'GAME_OVER') {
        if (gameStartTimestampRef.current) {
          currentTotalGameMs = elapsedGameTimeBeforePauseRef.current + (now - gameStartTimestampRef.current);
          setTotalGameTimeMs(currentTotalGameMs);
        }
        if (phaseStartTimestampRef.current) {
          currentPhaseMs = elapsedPhaseTimeBeforePauseRef.current + (now - phaseStartTimestampRef.current);
          setCurrentPhaseTimeMs(currentPhaseMs);
        }
      } else if (gameStateRef.current.isPaused) {
        currentTotalGameMs = elapsedGameTimeBeforePauseRef.current;
        setTotalGameTimeMs(currentTotalGameMs);
        currentPhaseMs = elapsedPhaseTimeBeforePauseRef.current;
        setCurrentPhaseTimeMs(currentPhaseMs);
      } else if (gameStateRef.current.currentPhase === 'GAME_OVER') {
        // Values should be final.
      }
      
      setTotalGameTimeDisplay(formatDuration(currentTotalGameMs));
      setCurrentPhaseTimeDisplay(formatDuration(currentPhaseMs));

      if (isGameStarted && !gameStateRef.current.isPaused && gameStateRef.current.currentPhase !== 'GAME_OVER') {
        animationFrameId = requestAnimationFrame(updateDisplaysLogic);
      }
    };

    if (isGameStarted) {
        animationFrameId = requestAnimationFrame(updateDisplaysLogic);
    } else {
        setTotalGameTimeDisplay(formatDuration(0));
        setCurrentPhaseTimeDisplay(formatDuration(0));
    }
    
    return () => cancelAnimationFrame(animationFrameId);
  }, [isGameStarted, gameState.isPaused, gameState.currentPhase, formatDuration, totalGameTimeMs, currentPhaseTimeMs]);


  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (isMountedRef.current && isGameStarted && !gameStateRef.current.isPaused && gameStateRef.current.currentPhase !== 'GAME_OVER') {
          const now = Date.now();
          if (gameStartTimestampRef.current === null) gameStartTimestampRef.current = now; 
          if (phaseStartTimestampRef.current === null) phaseStartTimestampRef.current = now;
           if (isLoadingAI && aiTurnStartTimeRef.current === null) aiTurnStartTimeRef.current = now; 
        }
      } else { 
         if (isMountedRef.current && isGameStarted && !gameStateRef.current.isPaused && gameStateRef.current.currentPhase !== 'GAME_OVER') {
             const now = Date.now();
             if (gameStartTimestampRef.current) elapsedGameTimeBeforePauseRef.current += (now - gameStartTimestampRef.current);
             if (phaseStartTimestampRef.current) elapsedPhaseTimeBeforePauseRef.current += (now - phaseStartTimestampRef.current);
             if (aiTurnStartTimeRef.current) elapsedIndividualAiTurnTimeBeforePauseRef.current += (now - aiTurnStartTimeRef.current);
             gameStartTimestampRef.current = null;
             phaseStartTimestampRef.current = null;
             aiTurnStartTimeRef.current = null;
         }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isGameStarted, gameState.isPaused, gameState.currentPhase, isLoadingAI]);


  useEffect(() => {
    if (completedFullTurnsRef.current > 0 && allFullTurnDurationsMsRef.current.length > 0) {
        const totalDuration = allFullTurnDurationsMsRef.current.reduce((sum, duration) => sum + duration, 0);
        setAverageFullTurnTimeDisplay(formatDuration(totalDuration / allFullTurnDurationsMsRef.current.length));
    } else {
        setAverageFullTurnTimeDisplay(formatDuration(0));
    }
  }, [completedFullTurnsRef.current, formatDuration]); 

  const handleExportGameState = () => {
    const jsonData = JSON.stringify(gameState, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
    a.download = `noospheric_conquest_state_${timestamp}.json`;
    a.href = url;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addSystemLog("Game state exported.", "INFO");
  };
  
  const handleLoadGameState = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const result = e.target?.result as string;
                const backupData = JSON.parse(result) as NoosphericGameState;
                if (backupData.mapNodes && backupData.factions && backupData.mapType) {
                    setGameState(backupData);
                    setCurrentMapTypeInternal(backupData.mapType);
                    setActiveModifiers({
                        isGreatWarMode: backupData.isGreatWarMode ?? false,
                        isFogOfWarActive: backupData.isFogOfWarActive
                    });
                    setIsGameStarted(true); // Mark as started since we're loading a state
                    // Reset timers and related states as this is effectively a new "session"
                    gameStartTimestampRef.current = Date.now();
                    phaseStartTimestampRef.current = Date.now();
                    currentTurnStartTimestampRef.current = Date.now();
                    elapsedGameTimeBeforePauseRef.current = 0;
                    elapsedPhaseTimeBeforePauseRef.current = 0;
                    allFullTurnDurationsMsRef.current = [];
                    completedFullTurnsRef.current = 0;
                    lastTurnDurationMsRef.current = 0;
                    setTotalGameTimeMs(0);
                    setCurrentPhaseTimeMs(0);
                    setTotalGameTimeDisplay(formatDuration(0));
                    setCurrentPhaseTimeDisplay(formatDuration(0));
                    setAverageFullTurnTimeDisplay(formatDuration(0));
                    setLastAiProcessingTimeDisplay(formatDuration(0));

                    addSystemLog("Game state loaded from file.", "INFO");
                } else {
                    throw new Error("Invalid game state file format.");
                }
            } catch (error: any) {
                addSystemLog(`Error loading game state: ${error.message}`, "ERROR");
            }
        };
        reader.readAsText(file);
        if (event.target) event.target.value = ''; // Clear file input
    }
  };


  const renderHeader = () => (
    <header className="flex flex-col sm:flex-row justify-between items-center mb-2 p-2 bg-[var(--color-bg-panel)] rounded-md shadow-md flex-shrink-0">
      <h1 className="text-lg md:text-xl font-bold text-[var(--color-text-heading)]">
          Noospheric Conquest <span className="text-sm text-[var(--color-text-muted)]">- {isGameStarted ? gameState.mapType : currentMapTypeInternal}</span>
          {gameState.isGreatWarMode && isGameStarted && <span className="text-xs ml-2 px-1.5 py-0.5 bg-red-700 text-white rounded-sm uppercase tracking-wider">Great War</span>}
          {gameState.isFogOfWarActive && isGameStarted && <span className="text-xs ml-2 px-1.5 py-0.5 bg-slate-600 text-white rounded-sm uppercase tracking-wider">Fog of War</span>}
      </h1>
      <div className="flex items-center space-x-1 sm:space-x-2 mt-2 sm:mt-0">
          <button
            onClick={onLyriaPlayPause}
            disabled={!isLyriaReady || isEmergencyStopActive || (lyriaPlaybackState === 'error')}
            className="p-1.5 bg-[var(--color-bg-button-primary)] rounded-full hover:bg-[var(--color-bg-button-primary-hover)] disabled:opacity-50 flex-shrink-0 focus-ring-accent"
            title={lyriaPlaybackState === 'playing' || lyriaPlaybackState === 'loading' ? "Pause Lyria Music" : "Play Lyria Music"}
            aria-label={lyriaPlaybackState === 'playing' || lyriaPlaybackState === 'loading' ? "Pause Lyria Music" : "Play Lyria Music"}
          >
            {lyriaPlaybackState === 'loading' ? (
                <svg className="w-4 h-4 text-[var(--color-text-button-primary)] animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            ) : lyriaPlaybackState === 'playing' ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-[var(--color-text-button-primary)]">
                  <path d="M5.75 3a.75.75 0 0 0-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 0 0 .75-.75V3.75A.75.75 0 0 0 7.25 3h-1.5ZM12.75 3a.75.75 0 0 0-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 0 0 .75-.75V3.75a.75.75 0 0 0-.75-.75h-1.5Z" />
                </svg>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-[var(--color-text-button-primary)]"><path d="M6.3 2.841A1.5 1.5 0 0 0 4 4.11V15.89a1.5 1.5 0 0 0 2.3 1.269l9.344-5.89a1.5 1.5 0 0 0 0-2.538L6.3 2.84Z" /></svg>
            )}
          </button>
          {!isGameStarted ? (
              <>
                  <div className="control-group flex items-center">
                      <label htmlFor="mapTypeSelect" className="text-xs text-[var(--color-text-muted)] mr-1.5">Map:</label>
                      <select
                          id="mapTypeSelect"
                          value={currentMapTypeInternal}
                          onChange={handleMapTypeChangeInternal}
                          className="bg-[var(--color-bg-dropdown)] border border-[var(--color-border-input)] text-[var(--color-text-base)] p-1 rounded-sm text-[10px] focus-ring-accent"
                          disabled={isGameStarted || isLoadingAI !== null}
                      >
                          {ALL_MAP_TYPES.map((mapTypeItem: NoosphericMapType, index: number) => {
                              const mapTypeString = mapTypeItem as string;
                              return (
                                <option key={`${mapTypeString}-${index}`} value={mapTypeString}>{mapTypeString}</option>
                              );
                          })}
                      </select>
                  </div>
                   <button
                      onClick={() => setIsModifiersModalOpen(true)}
                      className="px-2 py-1 bg-[var(--color-bg-button-secondary)] text-[var(--color-text-button-secondary)] rounded hover:bg-[var(--color-bg-button-secondary-hover)] focus-ring-accent text-xs font-semibold uppercase tracking-wider"
                      disabled={isGameStarted || isLoadingAI !== null}
                    >
                      Modifiers
                    </button>
                  <button
                      onClick={handleStartNewGameClick}
                      disabled={!isOverallAiReady || isLoadingAI !== null || isEmergencyStopActive}
                      className="px-2.5 py-1 bg-[var(--color-bg-button-primary)] text-[var(--color-text-button-primary)] rounded hover:bg-[var(--color-bg-button-primary-hover)] focus-ring-primary text-xs font-semibold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                      Start Game
                  </button>
              </>
          ) : (
             <button
                onClick={handleNewGameButtonClickInHeader}
                disabled={isLoadingAI !== null || isEmergencyStopActive}
                className="px-2 py-1 bg-[var(--color-bg-button-primary)] text-[var(--color-text-button-primary)] rounded hover:bg-[var(--color-bg-button-primary-hover)] focus-ring-primary text-xs font-semibold uppercase tracking-wider disabled:opacity-50"
            >
                New Game Setup
            </button>
          )}
           <button
                onClick={handlePauseToggle}
                disabled={!isGameStarted || gameState.currentPhase === 'GAME_OVER' || isEmergencyStopActive}
                className="px-2 py-1 bg-[var(--color-bg-button-secondary)] text-[var(--color-text-button-secondary)] rounded hover:bg-[var(--color-bg-button-secondary-hover)] focus-ring-accent text-xs disabled:opacity-50"
            >
                {gameState.isPaused ? 'Resume' : 'Pause'}
            </button>
            {/* --- NEW UNIFIED SAVE/LOAD DATA MENU --- */}
            <div className="relative">
                <button
                    onClick={() => setIsDataMenuOpen(prev => !prev)}
                    className="p-1.5 bg-[var(--color-bg-button-secondary)] text-[var(--color-text-button-secondary)] rounded hover:bg-[var(--color-bg-button-secondary-hover)] focus-ring-accent"
                    title="Save or Load Game State"
                    aria-haspopup="true"
                    aria-expanded={isDataMenuOpen}
                >
                    {/* Save/Load Icon */}
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                </button>
                
                {/* Dropdown Menu */}
                {isDataMenuOpen && (
                    <div 
                        className="absolute right-0 mt-2 w-48 bg-[var(--color-bg-panel)] border-2 border-[var(--color-border-base)] rounded-md shadow-lg z-20"
                        role="menu"
                    >
                        <button
                            onClick={() => { handleExportGameState(); setIsDataMenuOpen(false); }}
                            disabled={!isGameStarted}
                            className="w-full text-left px-4 py-2 text-xs text-[var(--color-text-base)] hover:bg-[var(--color-bg-button-secondary-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
                            role="menuitem"
                        >
                            Export Current State (.json)
                        </button>
                        <button
                            onClick={() => { loadGameInputRef.current?.click(); setIsDataMenuOpen(false); }}
                            disabled={isGameStarted}
                            className="w-full text-left px-4 py-2 text-xs text-[var(--color-text-base)] hover:bg-[var(--color-bg-button-secondary-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
                            role="menuitem"
                        >
                            Load State from File...
                        </button>
                    </div>
                )}
            </div>
            <input
                type="file"
                ref={loadGameInputRef}
                onChange={handleLoadGameState}
                className="hidden"
                accept=".json"
            />
            {/* --- END OF NEW MENU --- */}
             <select
                id="ncAppModeSelectHeader"
                value={currentAppMode}
                onChange={(e) => onModeChange(e.target.value as AppMode)}
                className="bg-[var(--color-bg-dropdown)] border border-[var(--color-border-input)] text-[var(--color-text-base)] p-1 rounded-sm text-[10px] focus-ring-accent"
                title="Change simulation mode"
                disabled={isEmergencyStopActive}
            >
                {Object.values(AppMode).map(mode => ( <option key={mode} value={mode}>{mode}</option>))}
            </select>
            <button
                onClick={onOpenInfoModal}
                title="About Noospheric Conquest Mode"
                className="p-0.5 rounded-full hover:bg-[var(--color-bg-button-secondary-hover)] focus-ring-accent"
                aria-label="Show information about Noospheric Conquest mode"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-[var(--color-accent-300)]">
                <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                </svg>
            </button>
      </div>
    </header>
  );

  if (appInitializationError && !isGameStarted) {
    return (
      <div className="flex flex-col h-full w-full items-center justify-center p-4">
        {renderHeader()}
        <p className="text-lg text-[var(--color-error)] mt-10">Error: {appInitializationError}</p>
        <p className="text-[var(--color-text-muted)]">Please ensure your API key is correctly configured and try again.</p>
      </div>
    );
  }

  const renderAnalysisPanel = (factionId: 'GEM-Q' | 'AXIOM', showHistoryState: boolean, setShowHistoryState: (show: boolean) => void) => {
    const faction = gameState.factions[factionId];
    const factionName = factionId === 'GEM-Q' ? AI1_NAME : AI2_NAME;
    const title = `${factionName} (S:${faction.successfulTurnAttempts || 0}/F:${faction.failedTurnAttempts || 0}) - Tactical Analysis`;
    const borderColorClass = factionId === 'GEM-Q' ? 'border-[var(--color-ai1-text)]' : 'border-[var(--color-ai2-text)]';
    const textColorClass = factionId === 'GEM-Q' ? 'text-[var(--color-ai1-text)]' : 'text-[var(--color-ai2-text)]';

    return (
        <div className={`bg-[var(--color-bg-terminal)] border-2 ${borderColorClass} shadow-md p-3 h-full overflow-hidden`}>
            <div className="h-full flex flex-col overflow-hidden min-h-0">
                <div className="flex justify-between items-center border-b border-[var(--color-border-strong)] pb-1 mb-2 flex-shrink-0">
                    <h3 className={`text-sm font-bold ${textColorClass}`}>
                        {isLoadingAI === factionId && !faction.aiError && !showHistoryState ? `${factionName} - Analyzing...` : title}
                    </h3>
                    {faction.tacticalAnalysisHistory && faction.tacticalAnalysisHistory.length > 0 && (
                        <button
                            onClick={() => setShowHistoryState(!showHistoryState)}
                            className="text-[9px] px-1.5 py-0.5 bg-[var(--color-bg-button-secondary)] text-[var(--color-text-button-secondary)] rounded hover:bg-[var(--color-bg-button-secondary-hover)] focus-ring-accent"
                        >
                            {showHistoryState ? 'Current' : `History (${faction.tacticalAnalysisHistory.length})`}
                        </button>
                    )}
                </div>
                <div className="text-xs text-[var(--color-text-muted)] overflow-y-auto flex-grow min-h-0 log-display custom-scrollbar">
                    {showHistoryState ? (
                        faction.tacticalAnalysisHistory && faction.tacticalAnalysisHistory.length > 0 ? (
                            faction.tacticalAnalysisHistory.slice().reverse().map((entry, idx) => (
                                <div key={`analysis-hist-${factionId}-${entry.turn}-${entry.phase}-${idx}`} className={`p-1 border-b border-dashed border-[var(--color-border-strong)] border-opacity-20 last:border-b-0 ${idx === 0 ? 'bg-black bg-opacity-10' : ''}`}>
                                    <p className="font-semibold text-[var(--color-text-muted)] text-[10px]">
                                        T{entry.turn} {entry.phase.substring(0,4)}:
                                    </p>
                                    <p className="whitespace-pre-wrap break-words text-[11px]">{entry.analysis}</p>
                                </div>
                            ))
                        ) : (
                            <p>No analysis history available.</p>
                        )
                    ) : (
                        isLoadingAI === factionId && !faction.aiError ? (
                            <p className="animate-pulse">Analyzing situation...</p>
                        ) : faction.aiError ? (
                             <p className="text-red-400 whitespace-pre-wrap break-words">Error: {faction.aiError}</p>
                        ) : faction.tacticalAnalysis ? (
                            <p className="whitespace-pre-wrap break-words">{faction.tacticalAnalysis}</p>
                        ) : (
                            <p>Awaiting analysis...</p>
                        )
                    )}
                </div>
            </div>
        </div>
    );
};


  return (
    <div className="flex flex-col h-full w-full bg-[var(--color-bg-page)] text-[var(--color-text-base)] p-1 md:p-2 overflow-hidden">
      <div ref={dataDivRef} id="noospheric-conquest-container-data" style={{ display: 'none' }}></div>
      {renderHeader()}
      <div className="flex flex-col md:flex-row flex-grow gap-2 min-h-0">
        <main className="w-full md:flex-1 flex flex-col gap-2 min-h-0">
            <div className="flex-grow min-h-0 relative">
                 <NoosphericMapDisplay
                    nodes={Object.values(gameState.mapNodes)}
                    onNodeClick={handleNodeClick}
                    selectedNodeId={selectedNodeId}
                    factionColors={{
                        'GEM-Q': THEMES[activeTheme]?.ai1TextColor || '#ef4444',
                        'AXIOM': THEMES[activeTheme]?.ai2TextColor || '#22d3ee',
                        'NEUTRAL': '#6b7280',
                        'KJ_NEUTRAL': THEMES[activeTheme]?.neutralKJColor || '#eab308',
                    }}
                    isLoadingAI={isLoadingAI}
                    activePlayer={gameState.activePlayer}
                    gameState={gameState}
                />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 h-auto lg:h-36 flex-shrink-0">
                {renderAnalysisPanel('GEM-Q', showGemQAnalysisHistory, setShowGemQAnalysisHistory)}
                {renderAnalysisPanel('AXIOM', showAxiomAnalysisHistory, setShowAxiomAnalysisHistory)}
            </div>
        </main>
        <NoosphericSidebar
            gameState={gameState}
            selectedNodeId={selectedNodeId}
            isLoadingAI={isLoadingAI}
            onOpenInfoModal={onOpenInfoModal}
            activeTheme={activeTheme}
            isGameStarted={isGameStarted}
            currentPhaseTimeDisplay={currentPhaseTimeDisplay}
            averageFullTurnTimeDisplay={averageFullTurnTimeDisplay}
            lastAiProcessingTimeDisplay={lastAiProcessingTimeDisplay}
            totalGameTimeDisplay={totalGameTimeDisplay}
            formatDuration={formatDuration}
        />
      </div>
      {latestBattleReportForModal && (
        <BattleReportModal
            report={latestBattleReportForModal}
            factionColors={THEMES[activeTheme]}
            onClose={() => setLatestBattleReportForModal(null)}
        />
      )}
      {isModifiersModalOpen && (
        <NoosphericModifiersModal
            isOpen={isModifiersModalOpen}
            onClose={() => setIsModifiersModalOpen(false)}
            modifiers={availableModifiers}
            activeModifiers={activeModifiers}
            onModifierChange={handleModifierChange}
        />
      )}
       <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--color-scrollbar-thumb-hover); border-radius: 3px; }
        .custom-scrollbar { scrollbar-width: thin; scrollbar-color: var(--color-scrollbar-thumb-hover) rgba(0,0,0,0.2); }
      ` }} />
    </div>
  );
};

export default NoosphericConquestContainer;
