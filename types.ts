import { Content, Chat, GoogleGenAI, Scale } from "@google/genai";

export enum AppMode {
  // SPIRAL_EXE = "spiral.exe", 
  // HYPERSTITION_CHAT_EXE = "hypersition-chat.exe",
  SEMANTIC_ESCAPE_EXE = "semantic_escape.exe",
  UNIVERSE_SIM_EXE = "universe-sim.exe",
  CHESS_SIM_EXE = "chess-sim.exe",
  // CORRUPTION_EXE = "corruption.exe",
  NOOSPHERIC_CONQUEST_EXE = "noospheric-conquest.exe",
  STORY_WEAVER_EXE = "story_weaver.exe",
  CHIMERA_EXE = "chimera.exe",
}

export interface MatrixSettings {
  speed: number;
  glitchEffect: boolean;
  isPaused: boolean;
  matrixColor: string; // Dynamically set by theme for matrix character color
}

export type TextModelId =
  | 'gemini-2.5-flash'
  | 'gemini-2.5-flash-lite'
  | 'gemini-2.5-pro'
  | 'gemini-2.0-flash'
  | 'gemma-3n-e2b-it'
  | 'gemma-3n-e4b-it'
  | 'gemma-3-4b-it'
  | 'gemma-3-12b-it'
  | 'gemma-3-27b-it';

export type ImageModelId = 'imagen-3.0-generate-002';


export interface AIPersona {
  name: string;
  systemPrompt: string;
  color: string; // Tailwind CSS class using CSS variable, e.g. text-[var(--color-ai1-text)]
  modelName: TextModelId | ImageModelId; 
  initialInternalHistory?: Content[];
}

export interface ChatMessage {
  id: string;
  sender: string; 
  text: string;
  timestamp: string;
  isUser: boolean; 
  color?: string; 
}

export type ModeStartMessageSeed = Omit<ChatMessage, 'id' | 'timestamp' | 'isUser'>;

export interface ImageSnapshot {
  id: string;
  url: string;
  prompt: string;
  timestamp: number;
}

export type ApiKeySource = 'custom' | 'environment' | 'missing';

export interface ControlsPanelProps {
  matrixSettings: MatrixSettings;
  onMatrixSettingsChange: <K extends keyof MatrixSettings>(key: K, value: MatrixSettings[K]) => void;
  onCopyChat: () => void;
  onExportTXT: () => void;
  onExportMD: () => void;
  onBackupChat: () => void;
  onLoadChat: (event: React.ChangeEvent<HTMLInputElement>) => void;
  isAIsTyping: boolean;
  activeAIName: string | null;
  currentMode: AppMode;
  onModeChange: (newMode: AppMode) => void;
  onSendUserIntervention: (text: string, target: InterventionTarget) => void;
  currentTypingSpeed: number;
  onTypingSpeedChange: (speed: number) => void;
  onCompleteCurrentMessage: () => void;
  activeTheme: ThemeName;
  onThemeChange: (themeName: ThemeName) => void;
  onOpenInfoModal: () => void;
  onPrintModelConfigs: () => void;
  globalSelectedModelId?: string;
  onGlobalModelChange?: (modelId: string) => void;
  isEmergencyStopActive: boolean;
  onEmergencyStopToggle: () => void;
  onSaveCustomApiKey: (key: string) => void;
  onClearCustomApiKey: () => void;
  activeApiKeySource: ApiKeySource;
  initialCustomKeyValue: string;
  apiKeyMissingError: boolean;

  // Lyria Props lifted from ControlsPanel to App
  lyriaPrompts: LyriaPrompt[];
  lyriaConfig: LiveMusicGenerationConfig;
  lyriaPlaybackState: LyriaPlaybackState;
  lyriaStatusMessage: string;
  isLyriaModalOpen: boolean;
  onToggleLyriaModal: (isOpen: boolean) => void;
  isLyriaSaveLoadModalOpen: boolean;
  onToggleLyriaSaveLoadModal: (isOpen: boolean) => void;
  onAddLyriaPrompt: () => void;
  onRemoveLyriaPrompt: (id: string) => void;
  onLyriaPromptTextChange: (id: string, text: string) => void;
  onLyriaPromptWeightChange: (id: string, weight: number) => void;
  onLyriaConfigChange: (key: keyof LiveMusicGenerationConfig, value: any) => void;
  onLyriaPlayPause: () => void;
  onLyriaResetContext: () => void;
  isLyriaReady: boolean;
  onSaveLyriaSettings: () => void;
  onLoadLyriaSettings: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export interface StorySeed {
  id: string;
  title: string;
  description: string;
  prompt: string;
}

export interface StoryOption {
  id: string;
  text: string;
}

export interface ConversationBackup {
  version: string;
  timestamp: string;
  mode: AppMode; 
  personas: { 
    ai1: { name: string; systemPrompt: string; initialInternalHistory?: Content[]; };
    ai2: { name: string; systemPrompt: string; initialInternalHistory?: Content[]; } | null;
  };
  conversationHistory: ChatMessage[];
  turnCycleCount: number;
  nextAiToSpeak: 'AI1' | 'AI2' | 'STORY_WEAVER';
  themeName?: ThemeName; 
  typingSpeedMs?: number; 
  matrixSettings?: Omit<MatrixSettings, 'matrixColor'>; 
  chessBoardFEN?: string;
  chessCurrentPlayer?: PlayerColor;
  chessCoTAI1?: string;
  chessCoTAI2?: string;
  chessGameStatus?: string;
  noosphericGameState?: NoosphericGameState;
  noosphericMapType?: NoosphericMapType; 
  imageSnapshots?: ImageSnapshot[];
  chimeraGameState?: ChimeraGameState; 
  globalSelectedModelId?: string; 
  storyWeaverTurnCount?: number; 
  lastGeneratedImageForStoryWeaver?: { mimeType: string; data: string; } | null;
  selectedStorySeed?: StorySeed | null; 
  storyContinuationOptions?: StoryOption[]; 
  isAwaitingStoryContinuationChoice?: boolean; 
  isAwaitingSeedChoice?: boolean; 
  lyriaPrompts?: LyriaPrompt[];
  lyriaConfig?: LiveMusicGenerationConfig;
}

export type InterventionTarget = 'CHAT_FLOW' | 'AI1' | 'AI2';

export type ThemeName = 'terminal' | 'cyanotype' | 'redzone' | 'cyberpunkYellow' | 'noosphericDark';

export interface ThemeColors {
  name: ThemeName;
  primary500: string;
  primary600: string;
  primary700: string;
  accent200: string;
  accent300: string;
  accent400: string;
  textBase: string;
  textHeading: string;
  textMuted: string;
  textPlaceholder: string;
  textButtonPrimary: string;
  textButtonSecondary: string;

  borderBase: string;
  borderStrong: string;
  borderInput: string;
  borderButtonPrimary: string;
  borderButtonSecondary: string;
  
  shadowBase: string;

  bgPage: string;
  bgTerminal: string;
  bgPanel: string;
  bgInput: string;
  bgButtonPrimary: string;
  bgButtonPrimaryHover: string;
  bgButtonSecondary: string;
  bgButtonSecondaryHover: string;
  bgDropdown: string;
  bgTooltip: string;
  bgModal: string;

  scrollbarThumb: string;
  scrollbarThumbHover: string;
  scrollbarTrack: string;

  matrixColor: string; 

  systemMessageColor: string;
  userInterventionColor: string;
  facilitatorColor: string;
  promptMessageColor: string;
  errorColor: string;
  infoColor: string;
  
  ai1TextColor: string;
  ai2TextColor: string;
  storyWeaverTextColor?: string; 
  neutralKJColor?: string; 
}

export enum PieceSymbol {
  PAWN = 'p',
  ROOK = 'r',
  KNIGHT = 'n',
  BISHOP = 'b',
  QUEEN = 'q',
  KING = 'k',
}

export enum PlayerColor {
  WHITE = 'w',
  BLACK = 'b',
}

export interface ChessPiece {
  symbol: PieceSymbol;
  color: PlayerColor;
}

export type ChessSquare = ChessPiece | null;
export type ChessBoardState = ChessSquare[][]; 

export interface UCIMove {
  from: { row: number; col: number };
  to: { row: number; col: number };
  promotion?: PieceSymbol; 
}

export interface ChessMoveDetail {
  player: PlayerColor;
  uci: string;
  cot: string;
  strategy: string;
  moveTimestamp: number; 
  timeTakenMs: number;
}

export interface ChessGameOutcome {
  winner: PlayerColor | 'draw' | 'error'; 
  reason: string; 
}

export interface ChessGameRecord {
  id: string; 
  startTime: string; 
  endTime: string; 
  moves: ChessMoveDetail[];
  outcome: ChessGameOutcome;
  ai1StrategyInitial: string; 
  ai2StrategyInitial: string; 
  finalFEN: string;
}

export interface ChessSystemLogEntry {
  id: string;
  timestamp: string; 
  message: string; 
  type: 'MOVE' | 'COT' | 'ERROR' | 'STRATEGY' | 'CAPTURE' | 'EVENT' | 'STATUS';
  player?: PlayerColor | 'OVERMIND'; 
}

export interface ChessModeContainerProps { // Added to original user file content
  ai1Chat: Chat | null;
  ai2Chat: Chat | null;
  genAI?: GoogleGenAI | null;
  apiKeyMissing: boolean;
  initialFen?: string;
  initialPlayer?: PlayerColor;
  initialCoTAI1?: string;
  initialCoTAI2?: string;
  initialGameStatus?: string;
  chessResetToken: number;
  currentAppMode: AppMode;
  onModeChange: (newMode: AppMode) => void;
  activeTheme: ThemeName;
  onThemeChangeForApp: (themeName: ThemeName) => void;
  isAiReadyForChessFromApp: boolean;
  appInitializationError: string | null;
  onOpenInfoModal: () => void;
  lyriaPlaybackState: LyriaPlaybackState;
  onLyriaPlayPause: () => void;
  isLyriaReady: boolean;
  isEmergencyStopActive: boolean;
}


export type NoosphericPlayerId = 'GEM-Q' | 'AXIOM' | 'NEUTRAL';
export type NoosphericMapType = "Global Conflict" | "Twin Peaks" | "Classic Lattice" | "Fractured Core" | "The Seraphim Grid" | "The Tartarus Anomaly";

export interface NoosphericNodeData {
  id: string; 
  label: string; 
  regionName: string; 
  owner: NoosphericPlayerId;
  standardUnits: number; 
  evolvedUnits: number;  
  qrOutput: number; 
  isKJ: boolean; 
  isCN: boolean; 
  x: number; 
  y: number;
  connections: string[]; 
  maxUnits?: number; 
  hasFabricationHub?: boolean;
  isHubActive?: boolean; 
  hubDisconnectedTurn?: number; 
}

export interface TacticalAnalysisEntry {
  turn: number;
  phase: NoosphericPhase;
  analysis: string;
}

export interface NoosphericFaction {
  id: NoosphericPlayerId;
  name: string;
  color: string; 
  qr: number; 
  nodesControlled: number;
  totalUnits: number; 
  totalStandardUnits: number; 
  totalEvolvedUnits: number;  
  activeHubsCount: number; 
  kjsHeld: number;
  tacticalAnalysis?: string;
  aiError?: string;
  successfulAttacks: number; 
  attacksLost: number;
  successfulDefenses: number;     
  defensesLost: number; 
  successfulTurnAttempts: number; 
  failedTurnAttempts: number; 
  unitsPurchased: number; 
  unitsLost: number; 
  tacticalAnalysisHistory: TacticalAnalysisEntry[]; 
}

export type NoosphericPhase = 'FLUCTUATION' | 'RESOURCE' | 'MANEUVER' | 'COMBAT' | 'GAME_OVER';

export interface NoosphericGameState {
  turn: number;
  currentPhase: NoosphericPhase;
  activePlayer: NoosphericPlayerId; 
  mapNodes: Record<string, NoosphericNodeData>; 
  factions: {
    'GEM-Q': NoosphericFaction;
    'AXIOM': NoosphericFaction;
  };
  systemLog: SystemLogEntry[];
  battleLog: BattleLogEntry[];
  mapType: NoosphericMapType; 
  isPaused: boolean;
  winner?: NoosphericPlayerId | 'DRAW' | 'SURRENDER';
  isFogOfWarActive: boolean;
  isGreatWarMode?: boolean;
}

export interface NoosphericConquestContainerProps { // Added to original user file content
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


export type NoosphericActionType = 
  | 'DEPLOY_UNITS' 
  | 'MOVE_UNITS' 
  | 'ATTACK_NODE' 
  | 'ACTIVATE_FABRICATION_HUB' 
  | 'EVOLVE_UNITS'; 

export interface NoosphericAIMoveAction {
  type: NoosphericActionType;
  nodeId?: string; 
  fromNodeId?: string; 
  toNodeId?: string; 
  units?: number; 
  unitsToEvolve?: number; 
}

export interface NoosphericAIResponse {
  actions: NoosphericAIMoveAction[];
  tacticalAnalysis: string;
}

export interface SystemLogEntry {
  id: string;
  timestamp: string;
  turn: number;
  phase: NoosphericPhase;
  message: string;
  type: 'EVENT' | 'AI_ACTION' | 'ERROR' | 'INFO';
  source?: NoosphericPlayerId; 
}

export interface DiceRollDetail {
  attackerRoll: number | string; 
  defenderRoll: number | string; 
  outcome: string; 
  attackerUnitsRemaining: number;
  defenderUnitsRemaining: number;
  attackerHadEvolved?: boolean;
  defenderHadEvolved?: boolean;
}

export interface BattleLogEntry {
  id: string;
  timestamp: string;
  turn: number;
  attacker: NoosphericPlayerId;
  defender: NoosphericPlayerId;
  fromNodeId?: string; 
  nodeId: string; 
  outcome: 'ATTACKER_WINS' | 'DEFENDER_WINS' | 'MUTUAL_LOSSES'; 
  attackerLosses: number;
  defenderLosses: number;
  nodeCaptured: boolean;
  attackerInitialUnits?: number;
  defenderInitialUnits?: number;
  nodeName?: string;
  unitsRemainingAtNode?: number;
  diceRolls: DiceRollDetail[]; 
}

export interface BattleReportData extends BattleLogEntry {}

export interface ModeInfo {
  title: string;
  overview: string;
  objective?: string;
  keyElements?: string[];
  gamePhases?: string[]; 
  aiInteraction?: string;
  winning?: string; 
  themePrompt?: string; 
}

export type SenderName =
  | "GEM-Q"
  | "AXIOM"
  | "SYSTEM"
  | "USER INTERVENTION"
  | "FACILITATOR"
  | "STORY_WEAVER"
  | "DM"
  | "PLAYER_AI"
  | "USER_INPUT"
  | "OVERMIND"; // Added OVERMIND

export type ChimeraGameMode = 'EXPLORATION' | 'COMBAT' | 'DIALOGUE' | 'CUTSCENE' | 'CHARACTER_CREATION';

export interface ChimeraItemEffect {
  heal?: boolean | { dice?: string; flat?: number; }; 
  damage?: { dice?: string; type?: string; };
  stat_buff?: { stat: keyof ChimeraCharacter['stats']; amount: number; duration?: number; };
}

export interface ChimeraItem {
  id: string;
  name: string;
  description: string;
  type: 'weapon' | 'armor' | 'consumable' | 'datachip' | 'keycard' | 'misc' | 'currency';
  quantity?: number;
  equipped?: boolean;
  effect_on_use?: ChimeraItemEffect;
  damageDice?: string; 
  ammoCapacity?: number;
  currentAmmo?: number;
  armorBonus?: number;
}

export interface ChimeraEffect {
  name: string;
  duration: number; 
  description: string;
  modifiers?: {
    stat?: Record<string, number>; 
    skill?: Record<string, number>;
    hp_change_per_turn?: number; 
    ac_change?: number;
  };
}

export interface ChimeraCharacter {
  id: string; 
  name: string;
  avatarUrl?: string; 
  avatarHistory?: string[]; 
  stats: Record<string, number>; 
  hp: { current: number; max: number };
  ac: number; 
  level: number;
  xp: { current: number; toNext: number };
  skills: Record<string, number>; 
  feats: string[]; 
  inventory: ChimeraItem[];
  activeEffects: ChimeraEffect[];
  isAlive: boolean;
  grid_pos: string; // Will now store ChimeraMapNode['id']
  dialogue_id?: string; 
}

export interface InteractableObject {
  id: string; 
  type: 'door' | 'terminal' | 'container' | 'npc_spawn' | 'furniture' | 'trigger_zone' | 'machinery' | 'ladder' | 'path' | 'gate';
  grid_pos: string; // Original fine-grained grid_pos, may become less relevant for map display
  svg_id?: string; 
  default_state?: string; 
  size_in_cells?: { width: number; height: number }; 
  leads_to?: string; 
  dc_to_unlock?: number;
  dc_to_find?: number; 
  dc_to_cross?: number; 
  skill_for_dc?: string; 
  key_required?: string; 
  loot_table_id?: string; 
  description?: string; 
  items?: ChimeraItem[]; 
}

export interface LocationBlueprint { 
  id: string;
  name: string;
  description: string;
  grid_size: { width: number; height: number }; 
  svg_viewBox: string; 
  interactables: InteractableObject[];
  spawn_points: { id: string; grid_pos: string; character_id?: string; }[]; 
  pathing_data?: number[][]; 
  worldState?: Record<string, any>; 
}

export interface QuestObjective {
  id: string;
  description: string;
  completed: boolean;
  targetId?: string; 
  hidden?: boolean;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  status: 'inactive' | 'active' | 'completed' | 'failed';
  objectives: QuestObjective[];
  giver?: string; 
  reward?: { xp?: number; items?: ChimeraItem[]; credits?: number; };
}

export interface ChimeraGameState {
  mode: ChimeraGameMode;
  playerCharacter: ChimeraCharacter;
  combatants: Record<string, ChimeraCharacter>; 
  turnOrder: string[]; 
  activeTurnIndex: number;
  worldState: Record<string, any> & { 
      playerArchetype?: string; 
      playerBackstory?: string;
      chimeraTurnCount?: number;
      isAwaitingFacilitator?: boolean;
  };
  isAwaitingPlayerAction: boolean;
  dmNarrative: string;
  currentMapId: string;
  currentNodeId: string; 
  quests: Quest[];
  activeLocalLog?: ChatMessage[]; 
  currentAutonomousTurns?: number; 
}

export type ChimeraPlayerActionType =
  | 'MOVE'          
  | 'SKILL_CHECK'   
  | 'INTERACT'      
  | 'EQUIP_ITEM'    
  | 'UNEQUIP_ITEM'  
  | 'USE_ITEM'      
  | 'ATTACK'        
  | 'PASS_TURN'
  | 'DIALOGUE_CHOICE' 
  | 'OPEN_INVENTORY' 
  | 'OPEN_CHARACTER_SHEET' 
  | 'OPEN_QUEST_LOG'; 

export interface ChimeraPlayerAction {
  type: ChimeraPlayerActionType;
  payload?: any;
}

export interface ChimeraMapNode {
  id: string;
  name: string;
  description: string;
  x: number; 
  y: number; 
  connections: string[]; 
  isStartNode?: boolean;
  isExitNode?: boolean;
  exitLeadsToMapId?: string;
  interactableObjectIds?: string[]; 
  npcIds?: string[]; 
  onEnterDMTrigger?: string; 
  onExitDMTrigger?: string; 
  visibility?: 'hidden' | 'explored' | 'visited';
}

export interface ChimeraMapData {
  id: string; 
  name: string; 
  description?: string;
  nodes: Record<string, ChimeraMapNode>;
  defaultEntryNodeId?: string; 
  ambientMusic?: string;
  mapSpecificEvents?: Record<string, any>; 
  originalLocationBlueprintId?: string; 
}


export interface ChimeraModeContainerProps {
  dmAiChat: Chat | null;
  playerAiChat: Chat | null;
  genAI: GoogleGenAI | null;
  addMessageToHistory: (sender: SenderName | string, text: string, color?: string, isUser?: boolean, makeActiveTyping?: boolean) => string;
  conversationHistory: ChatMessage[];
  commandHistory: string[];
  onCommandHistoryNavigation: (direction: 'up' | 'down', inputType: 'initial' | 'prompt' | 'universeSim' | 'chimera') => void; // Added 'chimera'
  typingSpeed: number;
  onTypingComplete: (messageId: string) => void;
  activeTypingMessageId: string | null; // This is the global one from App.tsx
  onSaveGameRequest?: () => void; 
  onLoadGameRequest?: (event: React.ChangeEvent<HTMLInputElement>) => void; 
  initialGameState?: ChimeraGameState;
  isEmergencyStopActive: boolean;
  onEmergencyStopToggle: () => void;
  currentMode: AppMode;
  onModeChange: (newMode: AppMode) => void;
  appInitializationError?: string | null; // From App.tsx initializationError
  appIsLoadingAi?: boolean; // From App.tsx isLoading
  appLoadingAiName?: string | null; // From App.tsx activeAINameForLoading
}

export interface StoryWeaverModeContainerProps {
  genAI: GoogleGenAI | null; 
  messages: ChatMessage[]; // This is App.tsx's conversationHistory
  addMessageToHistory: (sender: SenderName | string, text: string, color?: string, isUser?: boolean, makeActiveTyping?: boolean) => string;
  isLoadingAI: boolean; // This is App.tsx's isLoading state
  activeTypingMessageId: string | null; // This is App.tsx's currentTypingMessageId
  onTypingComplete: (messageId: string) => void;
  typingSpeed: number;
  storyWeaverTurnCount: number; 
  snapshots: ImageSnapshot[];
  isGeneratingImage: boolean;
  appInitializationError?: string | null;
  appIsLoadingAi?: boolean; 
  appLoadingAiName?: string | null;
  storySeeds: StorySeed[];
  selectedStorySeed: StorySeed | null;
  isAwaitingSeedChoice: boolean;
  onSelectStorySeed: (seed: StorySeed) => void;
  storyContinuationOptions: StoryOption[]; 
  isAwaitingStoryContinuationChoice: boolean; 
  onSelectStoryContinuation: (option: StoryOption) => void; 
  onSaveStoryWeaver: () => void; // Added for save functionality
  onLoadStoryWeaver: (event: React.ChangeEvent<HTMLInputElement>) => void; // Added for load functionality
  onRequestNewStoryImage: () => void; // Added for requesting new image
  onExportStoryBookMD: () => void; // For new storybook export
  onExportStoryBookPDF: () => void; // For new storybook PDF export
}

export interface TerminalWindowProps {
  title: string;
  messages: ChatMessage[];
  className?: string;
  isTypingActive?: boolean; // Should be based on whether this window is currently animating a message
  activeTypingMessageId?: string | null; // ID of the message being animated in this window
  onTypingComplete?: (messageId: string) => void;
  isPromptingUser?: boolean;
  userInputValue?: string;
  onUserInputChange?: (value: string) => void;
  onUserPromptSubmit?: () => void;
  isAwaitingInitialStart?: boolean;
  initialStartPromptMessageText?: string; 
  initialStartInputValue?: string; 
  onInitialStartInputChange?: (value: string) => void; 
  onInitialStartSubmit?: () => void; 
  typingSpeed: number;
  isUniverseSimActivePhase2?: boolean;
  universeSimInputValue?: string;
  onUniverseSimInputChange?: (value: string) => void;
  onUniverseSimInputSubmit?: () => void;
  currentMode: AppMode;
  commandHistory: string[]; 
  onCommandHistoryNavigation: (direction: 'up' | 'down', inputType: 'initial' | 'prompt' | 'universeSim' | 'chimera') => void; 
  isAppAiProcessing?: boolean; // New: Global AI processing state from App.tsx or parent container
  appProcessingAiName?: string | null; // New: Name of AI globally processing
  isAwaitingChimeraContinuation?: boolean; // Specific for Chimera mode's terminal
  storyWeaverHeaderContent?: React.ReactNode; // Optional content for StoryWeaver header
}

// Lyria Types (adapted from prompt-dj example)
export interface LyriaPrompt {
  readonly promptId: string;
  readonly color: string;
  text: string;
  weight: number;
}

export type LyriaPlaybackState = 'stopped' | 'playing' | 'loading' | 'paused' | 'error';

export interface LiveMusicGenerationConfig {
  temperature?: number;
  topK?: number;
  topP?: number; 
  guidance?: number;
  seed?: number;
  bpm?: number;
  density?: number; 
  brightness?: number; 
  scale?: Scale; 
  muteBass?: boolean;
  muteDrums?: boolean;
  onlyBassAndDrums?: boolean;
}

export interface LyriaSessionBackup {
  version: string;
  timestamp: string;
  prompts: LyriaPrompt[];
  config: LiveMusicGenerationConfig;
}