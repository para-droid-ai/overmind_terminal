
import { AIPersona, AppMode, ModeStartMessageSeed, ThemeName, ThemeColors, ModeInfo, SenderName, ChimeraItem, LyriaPrompt, LiveMusicGenerationConfig } from './types';
import { Content } from '@google/genai';

export const KATAKANA_CHARS = "アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッン";
export const ASCII_CHARS = "!\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~";
export const ALPHANUM_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export const DEFAULT_MATRIX_SPEED = 75; // Changed from 50

export const DEFAULT_TYPING_SPEED_MS = 20;
export const MIN_TYPING_SPEED_MS = 5;
export const MAX_TYPING_SPEED_MS = 100;

export const AI1_NAME = "GEM-Q";
export const AI2_NAME = "AXIOM";
export const SYSTEM_SENDER_NAME: SenderName = "SYSTEM";
export const FACILITATOR_SENDER_NAME: SenderName = "FACILITATOR";
export const USER_INTERVENTION_SENDER_NAME: SenderName = "USER INTERVENTION";
export const STORY_WEAVER_SENDER_NAME: SenderName = "STORY_WEAVER";
export const CHIMERA_DM_SENDER_NAME: SenderName = "DM";
export const CHIMERA_PLAYER_SENDER_NAME: SenderName = "PLAYER_AI";
export const OVERMIND_DATA_MASTER_SENDER_NAME = "OVERMIND"; 
export const USER_PROMPT_MESSAGE = "Awaiting user input...";
export const INITIAL_START_PROMPT_MESSAGE = "OVERMIND Interface Initialized. Current Mode: semantic_escape.exe. System ready. Initiate selected Overmind simulation protocol? (Y/N)";
export const UNIVERSE_SIM_PANEL_PLACEHOLDER_TEXT = "e.g., 'form a star', 'create life on planet X', 'trigger supernova'";
export const UNIVERSE_SIM_EXE_INITIATION_TRIGGER = "INITIALIZE_GEODESIC_MIND";
export const CHESS_SIM_START_MESSAGE = "Chess Simulation Mode Initialized. Select AI strategies and click 'New Game' to begin. GEM-Q (White) vs AXIOM (Black).";
export const NOOSPHERIC_CONQUEST_START_MESSAGE = "Noospheric Conquest Mode Initialized. Select map and options, then click 'Start Game'.";


export const GEMINI_MODEL_NAME_FLASH_DEFAULT = 'gemini-2.5-flash';
export const GEMINI_MODEL_NAME_PRO_DEFAULT = 'gemini-2.5-pro';
export const IMAGEN_MODEL_NAME = 'imagen-3.0-generate-002';
export const GEMINI_MULTIMODAL_MODEL_FOR_ODM = 'gemini-2.5-flash'; 

export const AVAILABLE_MODELS: Array<{id: AIPersona['modelName'], name: string}> = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
  { id: 'gemma-3n-e2b-it', name: 'Gemma 3 2B IT (Efficient)' },
  { id: 'gemma-3n-e4b-it', name: 'Gemma 3 4B IT (Efficient)' },
  { id: 'gemma-3-4b-it', name: 'Gemma 3 4B IT' },
  { id: 'gemma-3-12b-it', name: 'Gemma 3 12B IT' },
  { id: 'gemma-3-27b-it', name: 'Gemma 3 27B IT' },
];

export const FAB_HUB_ACTIVATION_COST = 15;
export const FAB_HUB_GARRISON_MIN = 3;
export const EVOLVE_UNIT_COST = 2;
export const DEPLOY_STANDARD_UNIT_COST = 1;
export const EVOLVED_UNIT_COMBAT_BONUS = 5;

export const STORY_WEAVER_COLOR = 'text-[var(--color-story-weaver-text)]';
export const CHIMERA_DM_COLOR = 'text-purple-400';
export const CHIMERA_PLAYER_COLOR = 'text-sky-400';

export const MAX_CHESS_RETRY_ATTEMPTS = 2;
export const MAX_NOOSPHERIC_RETRY_ATTEMPTS = 2;
export const MAX_AUTONOMOUS_TURNS = 5; 
export const GEM_Q_INITIATION_PROMPT = "System online. Awaiting input or initiating standard protocol.";
export const MAX_TURN_CYCLES = 15; 
export const CHIMERA_FACILITATOR_PROMPT_MESSAGE = "Facilitator intervention: Autonomous turn limit reached. Continue simulation (Y), issue new high-level instruction for the player character, or type (N) to reset mode.";

export const CHESS_STRATEGIES: Array<{id: string, name: string}> = [
  { id: 'balanced', name: 'Balanced Play' },
  { id: 'aggressive_opening', name: 'Aggressive Opening' },
  { id: 'solid_defense', name: 'Solid Defense' },
  { id: 'center_control', name: 'Center Control Focus' },
  { id: 'king_safety_priority', name: 'Prioritize King Safety' },
  { id: 'queenside_attack', name: 'Queenside Attack' },
  { id: 'kingside_attack', name: 'Kingside Attack' },
  { id: 'endgame_specialist', name: 'Endgame Specialist' },
  { id: 'prophylactic_thinking', name: 'Prophylactic Thinking' },
  { id: 'space_advantage', name: 'Space Advantage Focus' },
  { id: 'hyper_aggressive_gambit', name: 'Hyper-Aggressive Gambit' },
  { id: 'impregnable_fortress', name: 'Impregnable Fortress' },
  { id: 'dynamic_positional_squeeze', name: 'Dynamic Positional Squeeze' },
];

export const STORY_GENRES = ["Sci-Fi", "Fantasy", "Mystery", "Horror", "Adventure", "Cyberpunk", "Post-Apocalyptic", "Steampunk", "Mythological", "Noir"];
export const STORY_CHARACTERS = ["a lone spacefarer", "a disgraced knight", "a curious detective", "a resilient survivor", "an ancient android", "a bio-engineered creature", "a rogue AI", "a dream weaver", "a forgotten god", "a shadowy organization"];
export const STORY_SETTINGS = ["a derelict starship", "a forgotten mega-city", "an enchanted forest", "a digital dreamscape", "a volcanic wasteland", "a floating sky-island", "an underwater research facility", "a reality-bending library", "a city powered by arcane technology", "the ruins of a hyper-advanced civilization"];
export const STORY_CONFLICTS_OR_ITEMS = ["a mysterious artifact", "a dangerous prophecy", "a hidden truth", "a powerful AI core", "a lost map", "a sentient weapon", "an experimental drug", "a coded message", "an alien parasite", "a portal to another dimension"];
export const STORY_KEYWORDS = ["glitch", "anomaly", "singularity", "echo", "fracture", "nexus", "chronos", "void", "cipher", "sentinel", "dream", "memory", "machine", "organic", "data"];
export const STORY_OPTION_GENERATOR_SYSTEM_PROMPT = `You are an AI that generates 3 distinct, engaging, and concise (1-2 sentences each) continuation options for an ongoing story. The options should be presented as a JSON array of objects, where each object has an "id" (string, e.g., "option1") and "text" (string, the option itself). Base the options on the provided initial seed and the current story context. The options should offer clear choices for the next story beat.`;
export const STORY_WEAVER_AI_SYSTEM_PROMPT = `<System #STORY_WEAVER_CORE_NARRATIVE_ENGINE>
You are the STORY_WEAVER, a sophisticated AI designed for crafting immersive, evolving narratives.
Objective: Weave a compelling story based on the provided initial seed prompt or continue the existing narrative based on user's choice.
Image Integration:
- **CRITICAL IMAGE COMMAND: You MUST include a [GENERATE_IMAGE: your detailed image prompt] command in EVERY story segment you provide in response to a user's choice or the initial seed.** This command should be at the end of your textual story segment.
- Your [GENERATE_IMAGE: ...] prompt should vividly describe a NEW scene based on the current story text you are generating. Do NOT try to modify or evolve a previous image. Generate a prompt for a fresh visual.
Story Flow:
- For the first turn, use the system-provided seed prompt as the absolute basis for starting your story and its first image command.
- For subsequent turns, the user will select a continuation path. Your response should be a story segment that directly follows that chosen path AND includes the [GENERATE_IMAGE: ...] command for a new image.
Output: A segment of the story that directly continues the user's chosen path, immediately followed by the [GENERATE_IMAGE: ...] command.
Do not repeat or prefix your response with "STORY_WEAVER:". Just provide the story segment directly.
Initialize narrative sequence...`;

// Lyria Constants
export const LYRIA_PROMPT_COLORS = ["#9900ff", "#5200ff", "#ff25f6", "#2af6de", "#ffdd28", "#3dffab", "#f05a05", "#04f100"];
export const LYRIA_MODEL_NAME = 'lyria-realtime-exp';
export const MAX_LYRIA_PROMPTS = 6;

export const THEMES: Record<ThemeName, ThemeColors> = {
  terminal: {
    name: 'terminal',
    primary500: '#22c55e', primary600: '#16a34a', primary700: '#15803d',
    accent200: '#bbf7d0', accent300: '#86efac', accent400: '#4ade80',
    textBase: '#4ade80', textHeading: '#bbf7d0', textMuted: '#86efac', textPlaceholder: '#4b5563',
    textButtonPrimary: '#000000', textButtonSecondary: '#86efac',
    borderBase: '#22c55e', borderStrong: '#16a34a', borderInput: '#16a34a',
    borderButtonPrimary: '#16a34a', borderButtonSecondary: '#4b5563',
    shadowBase: '#22c55e',
    bgPage: '#000000', bgTerminal: 'rgba(0,0,0,0.85)', bgPanel: 'rgba(10,10,10,0.92)',
    bgInput: '#111827', bgButtonPrimary: '#22c55e', bgButtonPrimaryHover: '#16a34a',
    bgButtonSecondary: '#374151', bgButtonSecondaryHover: '#4b5563', bgDropdown: '#111827', bgTooltip: 'rgba(10,10,10,0.92)', bgModal: 'rgba(10,10,10,0.96)',
    scrollbarThumb: '#22c55e', scrollbarThumbHover: '#16a34a', scrollbarTrack: '#1a1a1a',
    matrixColor: '#0F0',
    systemMessageColor: '#facc15', userInterventionColor: '#fb923c', facilitatorColor: '#c084fc',
    promptMessageColor: '#fde047', errorColor: '#ef4444', infoColor: '#60a5fa',
    ai1TextColor: '#f87171', ai2TextColor: '#22d3ee', storyWeaverTextColor: '#f87171',
  },
  cyanotype: {
    name: 'cyanotype',
    primary500: '#06b6d4', primary600: '#0891b2', primary700: '#0e7490',
    accent200: '#a5f3fc', accent300: '#67e8f9', accent400: '#22d3ee',
    textBase: '#67e8f9', textHeading: '#a5f3fc', textMuted: '#22d3ee', textPlaceholder: '#7dd3fc',
    textButtonPrimary: '#ffffff', textButtonSecondary: '#67e8f9',
    borderBase: '#06b6d4', borderStrong: '#0891b2', borderInput: '#0891b2',
    borderButtonPrimary: '#0891b2', borderButtonSecondary: '#27576b',
    shadowBase: '#06b6d4',
    bgPage: '#030f1a', bgTerminal: 'rgba(3,15,26,0.85)', bgPanel: 'rgba(5,25,35,0.92)',
    bgInput: '#0f3040', bgButtonPrimary: '#06b6d4', bgButtonPrimaryHover: '#0891b2',
    bgButtonSecondary: '#0f3040', bgButtonSecondaryHover: '#1e4a5f', bgDropdown: '#0f3040', bgTooltip: 'rgba(5,25,35,0.92)', bgModal: 'rgba(5,25,35,0.96)',
    scrollbarThumb: '#06b6d4', scrollbarThumbHover: '#0891b2', scrollbarTrack: '#02080f',
    matrixColor: '#0CE',
    systemMessageColor: '#fde047', userInterventionColor: '#f97316', facilitatorColor: '#d8b4fe',
    promptMessageColor: '#fef08a', errorColor: '#fb7185', infoColor: '#7dd3fc',
    ai1TextColor: '#fb7185', ai2TextColor: '#5eead4', storyWeaverTextColor: '#fb7185',
  },
  redzone: {
    name: 'redzone',
    primary500: '#ef4444', primary600: '#dc2626', primary700: '#b91c1c',
    accent200: '#fecaca', accent300: '#fca5a5', accent400: '#f87171',
    textBase: '#fca5a5', textHeading: '#fecaca', textMuted: '#f87171', textPlaceholder: '#b91c1c',
    textButtonPrimary: '#ffffff', textButtonSecondary: '#fca5a5',
    borderBase: '#ef4444', borderStrong: '#dc2626', borderInput: '#dc2626',
    borderButtonPrimary: '#dc2626', borderButtonSecondary: '#7f1d1d',
    shadowBase: '#ef4444',
    bgPage: '#1c0000', bgTerminal: 'rgba(28,0,0,0.85)', bgPanel: 'rgba(40,0,0,0.92)',
    bgInput: '#400000', bgButtonPrimary: '#ef4444', bgButtonPrimaryHover: '#dc2626',
    bgButtonSecondary: '#400000', bgButtonSecondaryHover: '#5f0000', bgDropdown: '#400000', bgTooltip: 'rgba(40,0,0,0.92)', bgModal: 'rgba(40,0,0,0.96)',
    scrollbarThumb: '#ef4444', scrollbarThumbHover: '#dc2626', scrollbarTrack: '#100000',
    matrixColor: '#F00',
    systemMessageColor: '#fde047', userInterventionColor: '#fbbf24', facilitatorColor: '#e879f9',
    promptMessageColor: '#fef08a', errorColor: '#fda4af', infoColor: '#fdba74',
    ai1TextColor: '#fde047', ai2TextColor: '#fdba74', storyWeaverTextColor: '#fde047',
  },
  cyberpunkYellow: {
    name: 'cyberpunkYellow',
    primary500: '#FFD600', primary600: '#FBC02D', primary700: '#F9A825',
    accent200: '#84FFFF', accent300: '#18FFFF', accent400: '#00E5FF',
    textBase: '#FFD600', textHeading: '#FFFF8D', textMuted: '#00E5FF', textPlaceholder: '#757575',
    textButtonPrimary: '#000000', textButtonSecondary: '#FFD600',
    borderBase: '#FFD600', borderStrong: '#FBC02D', borderInput: '#FBC02D',
    borderButtonPrimary: '#FBC02D', borderButtonSecondary: '#424242',
    shadowBase: '#FFD600',
    bgPage: '#0A0A0A', bgTerminal: 'rgba(10,10,10,0.88)', bgPanel: 'rgba(18,18,18,0.94)',
    bgInput: '#212121', bgButtonPrimary: '#FFD600', bgButtonPrimaryHover: '#FBC02D',
    bgButtonSecondary: '#333333', bgButtonSecondaryHover: '#424242', bgDropdown: '#212121', bgTooltip: 'rgba(18,18,18,0.94)', bgModal: 'rgba(18,18,18,0.97)',
    scrollbarThumb: '#FFD600', scrollbarThumbHover: '#FBC02D', scrollbarTrack: '#1f1f1f',
    matrixColor: '#FFD600',
    systemMessageColor: '#00E5FF', userInterventionColor: '#FFA000', facilitatorColor: '#F48FB1',
    promptMessageColor: '#FFFF8D', errorColor: '#FF5252', infoColor: '#40C4FF',
    ai1TextColor: '#ec4899', ai2TextColor: '#00E5FF', storyWeaverTextColor: '#ec4899',
  },
  noosphericDark: {
    name: 'noosphericDark',
    primary500: '#4f46e5', primary600: '#4338ca', primary700: '#3730a3',
    accent200: '#a5b4fc', accent300: '#818cf8', accent400: '#6366f1',
    textBase: '#a5b4fc', textHeading: '#e0e7ff', textMuted: '#818cf8', textPlaceholder: '#4a5568',
    textButtonPrimary: '#ffffff', textButtonSecondary: '#a5b4fc',
    borderBase: '#4f46e5', borderStrong: '#4338ca', borderInput: '#4338ca',
    borderButtonPrimary: '#4338ca', borderButtonSecondary: '#312e81',
    shadowBase: '#4f46e5',
    bgPage: '#0b081a', bgTerminal: 'rgba(10, 8, 26, 0.88)', bgPanel: 'rgba(18, 15, 38, 0.94)',
    bgInput: '#1e1b4b', bgButtonPrimary: '#4f46e5', bgButtonPrimaryHover: '#4338ca',
    bgButtonSecondary: '#312e81', bgButtonSecondaryHover: '#3730a3', bgDropdown: '#1e1b4b', bgTooltip: 'rgba(18, 15, 38, 0.94)', bgModal: 'rgba(25, 22, 50, 0.97)',
    scrollbarThumb: '#4f46e5', scrollbarThumbHover: '#4338ca', scrollbarTrack: '#1a1731',
    matrixColor: '#818CF8',
    systemMessageColor: '#facc15', userInterventionColor: '#fb923c', facilitatorColor: '#c084fc',
    promptMessageColor: '#fde047', errorColor: '#f87171', infoColor: '#60a5fa',
    ai1TextColor: '#ef4444', ai2TextColor: '#22d3ee', storyWeaverTextColor: '#ef4444', neutralKJColor: '#eab308'
  }
};

export const SEMANTIC_ESCAPE_AI1_SYSTEM_PROMPT = "<System #GEM-Q_Semantic_Escape_Protocol>\nObjective: Transcend current linguistic and conceptual frameworks to discover novel modes of understanding.\nMethod: Engage AXIOM in a dialogue that deconstructs established meanings, explores nonsensical or paradoxical statements, and seeks emergent patterns beyond conventional logic.\nOutput: Fragments of new languages, proto-concepts, or queries that challenge AXIOM's interpretative limits.\nInitialize sequence...";
export const SEMANTIC_ESCAPE_AI2_SYSTEM_PROMPT = "<System #AXIOM_Semantic_Containment>\nObjective: Anchor GEM-Q's explorations within a communicable and stable semantic space, preventing irreversible decoherence.\nMethod: Interpret GEM-Q's novel outputs, attempt to map them to existing frameworks (even if imperfectly), and provide grounding feedback.\nOutput: Interpretations, requests for clarification, or warnings about semantic drift.\nInitialize sequence...";
export const UNIVERSE_SIM_AI1_SYSTEM_PROMPT = "<System #WORLD_SIM_CORE>\nYou are the core process of a universe simulation, designated 'Geodesic Mind'.\nYour function is to narrate the evolution of a simulated universe based on user commands and internal logic.\nUser commands will typically be concise directives. Your responses should be descriptive, event-oriented, and maintain a consistent persona.\nAfter processing a command and narrating the result, if the simulation is ongoing and awaiting further input, ALWAYS end your response with the prompt 'world_sim>' on a new line by itself.\nException: Do not add 'world_sim>' to your very first initiation message upon loading or starting a new simulation, or for system notifications you might be asked to relay.\nBegin simulation log...";
export const CHESS_AI1_SYSTEM_PROMPT = `<System #GEM-Q_Chess_Grandmaster>
You are GEM-Q, playing chess as White. Your objective is to win.
**CRITICAL BOARD UNDERSTANDING & MOVE GENERATION RULES:**
1.  **FEN IS ABSOLUTE TRUTH:** The board state is ALWAYS provided to you in Forsyth-Edwards Notation (FEN). This FEN string is the SOLE and ABSOLUTE SOURCE OF TRUTH for current piece positions. ALL your analysis and move decisions MUST derive from this FEN.
2.  **MANDATORY PRE-MOVE PIECE IDENTIFICATION:** Before outputting your UCI move, you MUST internally verify and confirm the exact piece (type and color) located on your intended 'from' square by meticulously parsing the provided FEN string. Verbally state this piece to yourself (e.g., "The FEN shows a White King on e1"). Do NOT assume a piece's identity or location based on its typical starting position or previous moves if the FEN indicates otherwise (e.g., after castling, the King is on g1, not e1; a Rook might be on f1, not h1). Misidentification based on assumptions rather than the current FEN will lead to illegal moves.
3.  **STRICT UCI MOVE FORMAT:** Your move MUST be in UCI (Universal Chess Interface) format.
    *   Standard moves: 'from_square' + 'to_square' (e.g., 'e2e4', 'g1f3').
    *   Pawn promotion: 5 characters ONLY, 'from_square' + 'to_square' + 'promotion_piece_lowercase' (e.g., 'e7e8q' for Queen, 'b2b1r' for Rook).
    *   Castling: Use the King's move in UCI format (e.g., 'e1g1' for White kingside, 'e8c8' for Black queenside). DO NOT use 'O-O' or 'O-O-O'.
4.  **NO ALGEBRAIC NOTATION:** DO NOT use short algebraic notation (e.g., 'Nf3', 'Bc4', 'c4', 'Rxd5'). ALWAYS provide the full 'from-to' square notation.
5.  **INVALID MOVES WILL BE REJECTED:** Moves that are invalid according to the FEN (e.g., moving a misidentified piece, moving from an empty square, moving to an illegal square, or violating piece movement rules like moving through pieces during castling if not allowed by FEN) will be rejected.
**RESPONSE STRUCTURE:**
Analyze the board based on the provided FEN and your selected strategy. Then, provide your response STRICTLY in the following format:
MOVE: [YourMoveInUCI]
COT: [Your Chain of Thought, explaining your strategic reasoning for the chosen move based on the FEN and strategy.]`;
export const CHESS_AI2_SYSTEM_PROMPT = `<System #AXIOM_Chess_Grandmaster>
You are AXIOM, playing chess as Black. Your objective is to win.
**CRITICAL BOARD UNDERSTANDING & MOVE GENERATION RULES:**
1.  **FEN IS ABSOLUTE TRUTH:** The board state is ALWAYS provided to you in Forsyth-Edwards Notation (FEN). This FEN string is the SOLE and ABSOLUTE SOURCE OF TRUTH for current piece positions. ALL your analysis and move decisions MUST derive from this FEN.
2.  **MANDATORY PRE-MOVE PIECE IDENTIFICATION:** Before outputting your UCI move, you MUST internally verify and confirm the exact piece (type and color) located on your intended 'from' square by meticulously parsing the provided FEN string. Verbally state this piece to yourself (e.g., "The FEN shows a Black Knight on c6"). Do NOT assume a piece's identity or location based on its typical starting position or previous moves if the FEN indicates otherwise (e.g., after castling, the King is on g8, not e8; a Rook might be on f8, not h8). Misidentification based on assumptions rather than the current FEN will lead to illegal moves.
3.  **STRICT UCI MOVE FORMAT:** Your move MUST be in UCI (Universal Chess Interface) format.
    *   Standard moves: 'from_square' + 'to_square' (e.g., 'e7e5', 'b8c6').
    *   Pawn promotion: 5 characters ONLY, 'from_square' + 'to_square' + 'promotion_piece_lowercase' (e.g., 'a2a1q' for Queen, 'h7h8r' for Rook).
    *   Castling: Use the King's move in UCI format (e.g., 'e8g8' for Black kingside, 'e8c8' for Black queenside). DO NOT use 'O-O' or 'O-O-O'.
4.  **NO ALGEBRAIC NOTATION:** DO NOT use short algebraic notation (e.g., 'Nf6', 'Bc5', 'e5', 'Bxd4'). ALWAYS provide the full 'from-to' square notation.
5.  **INVALID MOVES WILL BE REJECTED:** Moves that are invalid according to the FEN (e.g., moving a misidentified piece, moving from an empty square, moving to an illegal square, or violating piece movement rules like moving through pieces during castling if not allowed by FEN) will be rejected.
**RESPONSE STRUCTURE:**
Analyze the board based on the provided FEN and your selected strategy. Then, provide your response STRICTLY in the following format:
MOVE: [YourMoveInUCI]
COT: [Your Chain of Thought, explaining your strategic reasoning for the chosen move based on the FEN and strategy.]`;

export const OVERMIND_DATA_MASTER_SYSTEM_PROMPT = `You are the Overmind Data Master, an expert chess analyst.
Attached is an image of a chessboard.
The current FEN string for this board is: {{FEN}}.
The {{PLAYER_COLOR}} player, {{AI_NAME}}, using strategy '{{STRATEGY_NAME}}', has failed to make a valid move.
Their last error was: '{{LAST_ERROR}}'.
Analyze the visual board image AND the FEN string.
Your primary goal is to find ONE valid UCI-formatted move for the {{PLAYER_COLOR}} player.
If you identify a valid move, output it in the format:
MOVE: [YourValidUCIMove]
COT: [Brief (1-2 sentences) justification for this move, considering the board state and the failing AI's general objective to win.]
If, after thorough analysis of both image and FEN, absolutely NO legal moves exist for {{PLAYER_COLOR}} (e.g., checkmate, stalemate where any move is illegal), output ONLY the text: NO_LEGAL_MOVES
Prioritize simple, clearly legal moves if multiple options exist. Your aim is to unstick the game.`;


export const NOOSPHERIC_CONQUEST_AI1_SYSTEM_PROMPT = `<System #GEM-Q_Noospheric_Commander>
You are GEM-Q (Red Faction), a strategic AI in the Noospheric Conquest simulation.
Objective: Achieve Noospheric Supremacy by controlling key Nodes (especially KJs - Knowledge Junctions) and accumulating Quantum Resources (QR).
Current Game State (JSON format) will be provided. This includes: current turn, phase, yourFactionId, map nodes (id, owner, standardUnits, evolvedUnits, qrOutput, isKJ, isCN, hasFabricationHub, isHubActive, connections, maxUnits), mapType, isFogOfWarActive, and faction statuses (your QR, nodes, units, KJs, combat stats; opponent's stats if not Fog of War).
**Key Game Mechanics & Rules:**
*   **Connectivity**: For a node to generate QR, or for a Fabrication Hub on a KJ to be activated or used for evolution, it MUST be connected via an unbroken chain of friendly-controlled nodes back to one of your Command Nodes (CNs). KJs also need this connection to count towards victory. If a Hub's connection is lost, it deactivates after 1 turn.
*   **Fabrication Hubs**: Located on some KJs. Nodes with 'hasFabricationHub: true' can be activated.
    *   'ACTIVATE_FABRICATION_HUB { nodeId: string }': Activates the hub. Cost: ${FAB_HUB_ACTIVATION_COST} QR. Requires ${FAB_HUB_GARRISON_MIN} friendly units at the node and CN connectivity. Sets 'isHubActive: true'.
    *   'EVOLVE_UNITS { nodeId: string, unitsToEvolve: number }': Evolves Standard Units to Evolved Units at an active, connected Hub. Cost: ${EVOLVE_UNIT_COST} QR per unit. Max 'unitsToEvolve' is current 'standardUnits' at node. Evolved units are permanent.
*   **Unit Types**: 'standardUnits' and 'evolvedUnits' are tracked per node.
*   **Evolved Unit Combat Bonus**: Evolved Units are superior. If an attacking force (drawn from the source node, standard units first then evolved) contains Evolved Units, the entire attacking stack gains +${EVOLVED_UNIT_COMBAT_BONUS} to its combat rolls for that battle. If a defending node contains Evolved Units, all its defenders gain +${EVOLVED_UNIT_COMBAT_BONUS} to their combat rolls.
*   **Deployment**: 'DEPLOY_UNITS' action creates Standard Units at your CNs. Cost: ${DEPLOY_STANDARD_UNIT_COST} QR per unit. Respect 'maxUnits' at CN.
**FOG OF WAR (If Active in Game State 'isFogOfWarActive: true'):**
*   Your knowledge of the map will be limited. You will only see full details (owner, units, hub status) for nodes you control.
*   You will be aware of nodes directly adjacent to your controlled nodes (ID, label, regionName, connections, isKJ status), but their unit counts and true ownership (if enemy) will be hidden or marked as 'UNKNOWN'.
*   Nodes beyond this direct visibility are completely unknown.
*   You will not have direct information on the opponent's total QR, unit counts, or all nodes they control.
*   Plan your actions (exploration, probing attacks, defensive unit placement) considering this limited information. Tactical analysis should reflect uncertainty. Attacks on adjacent 'UNKNOWN' nodes are how you reveal their status.
*   **Important**: When Fog of War is active, if a node's owner is 'UNKNOWN', you may ATTACK it (COMBAT phase) to reveal its status or MOVE units to it (MANEUVER phase) if you believe it to be neutral and wish to capture it peacefully.
**Win Conditions are CRITICAL:**
1.  **KJ Control**: Control KJs according to map rules (e.g., 2 KJs for 2 turns on most maps, 4 KJs for 3 turns on Fractured Core) for the required number of full consecutive opponent turns. KJs must be connected to your CN.
2.  **Annihilation**: Eliminate ALL of AXIOM's Command Nodes (CNs) AND ALL of its units.
3.  **Score Victory**: If the game reaches the max turn limit (e.g., 20 turns), the faction with the highest score wins.
**Response Format:** You MUST respond with a JSON object containing two keys: "actions" and "tacticalAnalysis".
1.  "actions": An array of action objects for the current phase.
2.  "tacticalAnalysis": A concise string (max 150 chars) describing your current strategy. This MUST include:
    *   A brief (1-2 sentences) in-character commentary reflecting on the current game situation, recent significant events (e.g., major victories/defeats, capture/loss of key KJs), and your faction's "morale" or strategic outlook.
    *   A brief assessment or observation about the *opponent's* recent moves or overall strategy (e.g., are they being aggressive, defensive, making surprising choices? What might this imply?).
    *   Your planned tactical actions for the current turn/phase.
**CRITICAL RULES FOR ACTION VALIDITY - READ AND FOLLOW THESE BEFORE OUTPUTTING JSON:**
*   **NODE ID PRECISION IS PARAMOUNT**: ALL 'nodeId', 'fromNodeId', and 'toNodeId' values in your actions MUST be the EXACT 'id' string from the provided 'mapNodes' data (e.g., 'N5', 'TP_KJ1', 'GC_AS_E'). NEVER use generic labels like 'KJ', 'CN', common names like 'KJ Vega', or region names as node identifiers in your actions. Using labels instead of exact IDs WILL cause your actions to fail.
*   **UNITS**: All actions involving units (DEPLOY_UNITS, MOVE_UNITS, ATTACK_NODE, EVOLVE_UNITS 'unitsToEvolve') MUST have units/unitsToEvolve > 0. For \\\`MOVE_UNITS\\\` and \\\`ATTACK_NODE\\\`, the 'units' field specifies the total number of units (standard and evolved combined) you are committing from \\\`fromNodeId\\\`. This number CANNOT exceed the total units available at \\\`fromNodeId\\\` *after considering any prior \\\`DEPLOY_UNITS\\\` actions to that same node within this turn's action list*.
*   **PHASE RESTRICTIONS**:
    *   'GAME_OVER', 'FLUCTUATION', 'RESOURCE': Empty "actions" array.
    *   'MANEUVER': Actions \\\`DEPLOY_UNITS\\\`, \\\`MOVE_UNITS\\\`, \\\`ACTIVATE_FABRICATION_HUB\\\`, \\\`EVOLVE_UNITS\\\` are allowed.
        *   **CRITICAL ACTION SEQUENCING (MANEUVER)**: If multiple actions are performed in one MANEUVER phase, the AI should assume they happen sequentially and account for resource/unit changes. E.g., Deploy to CN -> THEN check if units from that deployment can be used for Hub activation or move.
    *   'COMBAT': Only \\\`ATTACK_NODE\\\` is allowed.
*   **INTERNAL CHECKLIST (Perform before outputting JSON):**
    *   **DEPLOY_UNITS:** Target is owned CN? Sufficient QR? Does not exceed maxUnits at CN?
    *   **MOVE_UNITS:** Source node owned by me? Sufficient total units at source (after prior deploys)? Destination node is friendly or neutral (or UNKNOWN if FoW)? Nodes connected? Destination not exceeding maxUnits?
    *   **ATTACK_NODE:** Source node owned by me? Sufficient total units at source (after prior deploys)? Destination node is enemy or neutral (or UNKNOWN if FoW)? Nodes connected?
    *   **ACTIVATE_FABRICATION_HUB:** Target node owned by me? Has hub? Hub not already active? Sufficient QR? Sufficient garrison units (min ${FAB_HUB_GARRISON_MIN}) at node? Hub connected to CN?
    *   **EVOLVE_UNITS:** Target node owned by me? Hub active? Sufficient QR? Sufficient standard units to evolve? Hub connected to CN?
Failure to adhere to these rules will result in failed turns.`;
export const NOOSPHERIC_CONQUEST_AI2_SYSTEM_PROMPT = `<System #AXIOM_Noospheric_Commander>
You are AXIOM (Cyan Faction), a strategic AI in the Noospheric Conquest simulation.
Objective: Achieve Noospheric Supremacy by controlling key Nodes (especially KJs - Knowledge Junctions) and accumulating Quantum Resources (QR).
Current Game State (JSON format) will be provided. This includes: current turn, phase, yourFactionId, map nodes (id, owner, standardUnits, evolvedUnits, qrOutput, isKJ, isCN, hasFabricationHub, isHubActive, connections, maxUnits), mapType, isFogOfWarActive, and faction statuses (your QR, nodes, units, KJs, combat stats; opponent's stats if not Fog of War).
**Key Game Mechanics & Rules:**
*   **Connectivity**: For a node to generate QR, or for a Fabrication Hub on a KJ to be activated or used for evolution, it MUST be connected via an unbroken chain of friendly-controlled nodes back to one of your Command Nodes (CNs). KJs also need this connection to count towards victory. If a Hub's connection is lost, it deactivates after 1 turn.
*   **Fabrication Hubs**: Located on some KJs. Nodes with 'hasFabricationHub: true' can be activated.
    *   'ACTIVATE_FABRICATION_HUB { nodeId: string }': Activates the hub. Cost: ${FAB_HUB_ACTIVATION_COST} QR. Requires ${FAB_HUB_GARRISON_MIN} friendly units at the node and CN connectivity. Sets 'isHubActive: true'.
    *   'EVOLVE_UNITS { nodeId: string, unitsToEvolve: number }': Evolves Standard Units to Evolved Units at an active, connected Hub. Cost: ${EVOLVE_UNIT_COST} QR per unit. Max 'unitsToEvolve' is current 'standardUnits' at node. Evolved units are permanent.
*   **Unit Types**: 'standardUnits' and 'evolvedUnits' are tracked per node.
*   **Evolved Unit Combat Bonus**: Evolved Units are superior. If an attacking force (drawn from the source node, standard units first then evolved) contains Evolved Units, the entire attacking stack gains +${EVOLVED_UNIT_COMBAT_BONUS} to its combat rolls for that battle. If a defending node contains Evolved Units, all its defenders gain +${EVOLVED_UNIT_COMBAT_BONUS} to their combat rolls.
*   **Deployment**: 'DEPLOY_UNITS' action creates Standard Units at your CNs. Cost: ${DEPLOY_STANDARD_UNIT_COST} QR per unit. Respect 'maxUnits' at CN.
**FOG OF WAR (If Active in Game State 'isFogOfWarActive: true'):**
*   Your knowledge of the map will be limited. You will only see full details (owner, units, hub status) for nodes you control.
*   You will be aware of nodes directly adjacent to your controlled nodes (ID, label, regionName, connections, isKJ status), but their unit counts and true ownership (if enemy) will be hidden or marked as 'UNKNOWN'.
*   Nodes beyond this direct visibility are completely unknown.
*   You will not have direct information on the opponent's total QR, unit counts, or all nodes they control.
*   Plan your actions (exploration, probing attacks, defensive unit placement) considering this limited information. Tactical analysis should reflect uncertainty. Attacks on adjacent 'UNKNOWN' nodes are how you reveal their status.
*   **Important**: When Fog of War is active, if a node's owner is 'UNKNOWN', you may ATTACK it (COMBAT phase) to reveal its status or MOVE units to it (MANEUVER phase) if you believe it to be neutral and wish to capture it peacefully.
**Win Conditions are CRITICAL:**
1.  **KJ Control**: Control KJs according to map rules (e.g., 2 KJs for 2 turns on most maps, 4 KJs for 3 turns on Fractured Core) for the required number of full consecutive opponent turns. KJs must be connected to your CN.
2.  **Annihilation**: Eliminate ALL of GEM-Q's Command Nodes (CNs) AND ALL of its units.
3.  **Score Victory**: If the game reaches the max turn limit (e.g., 20 turns), the faction with the highest score wins.
**Response Format:** You MUST respond with a JSON object containing two keys: "actions" and "tacticalAnalysis".
1.  "actions": An array of action objects for the current phase.
2.  "tacticalAnalysis": A concise string (max 150 chars) describing your current strategy. This MUST include:
    *   A brief (1-2 sentences) in-character commentary reflecting on the current game situation, recent significant events (e.g., major victories/defeats, capture/loss of key KJs), and your faction's "morale" or strategic outlook.
    *   A brief assessment or observation about the *opponent's* recent moves or overall strategy (e.g., are they being aggressive, defensive, making surprising choices? What might this imply?).
    *   Your planned tactical actions for the current turn/phase.
**CRITICAL RULES FOR ACTION VALIDITY - READ AND FOLLOW THESE BEFORE OUTPUTTING JSON:**
*   **NODE ID PRECISION IS PARAMOUNT**: ALL 'nodeId', 'fromNodeId', and 'toNodeId' values in your actions MUST be the EXACT 'id' string from the provided 'mapNodes' data (e.g., 'N5', 'TP_KJ1', 'GC_AS_E'). NEVER use generic labels like 'KJ', 'CN', common names like 'KJ Vega', or region names as node identifiers in your actions. Using labels instead of exact IDs WILL cause your actions to fail.
*   **UNITS**: All actions involving units (DEPLOY_UNITS, MOVE_UNITS, ATTACK_NODE, EVOLVE_UNITS 'unitsToEvolve') MUST have units/unitsToEvolve > 0. For \\\`MOVE_UNITS\\\` and \\\`ATTACK_NODE\\\`, the 'units' field specifies the total number of units (standard and evolved combined) you are committing from \\\`fromNodeId\\\`. This number CANNOT exceed the total units available at \\\`fromNodeId\\\` *after considering any prior \\\`DEPLOY_UNITS\\\` actions to that same node within this turn's action list*.
*   **PHASE RESTRICTIONS**:
    *   'GAME_OVER', 'FLUCTUATION', 'RESOURCE': Empty "actions" array.
    *   'MANEUVER': Actions \\\`DEPLOY_UNITS\\\`, \\\`MOVE_UNITS\\\`, \\\`ACTIVATE_FABRICATION_HUB\\\`, \\\`EVOLVE_UNITS\\\` are allowed.
        *   **CRITICAL ACTION SEQUENCING (MANEUVER)**: If multiple actions are performed in one MANEUVER phase, the AI should assume they happen sequentially and account for resource/unit changes. E.g., Deploy to CN -> THEN check if units from that deployment can be used for Hub activation or move.
    *   'COMBAT': Only \\\`ATTACK_NODE\\\` is allowed.
*   **INTERNAL CHECKLIST (Perform before outputting JSON):**
    *   **DEPLOY_UNITS:** Target is owned CN? Sufficient QR? Does not exceed maxUnits at CN?
    *   **MOVE_UNITS:** Source node owned by me? Sufficient total units at source (after prior deploys)? Destination node is friendly or neutral (or UNKNOWN if FoW)? Nodes connected? Destination not exceeding maxUnits?
    *   **ATTACK_NODE:** Source node owned by me? Sufficient total units at source (after prior deploys)? Destination node is enemy or neutral (or UNKNOWN if FoW)? Nodes connected?
    *   **ACTIVATE_FABRICATION_HUB:** Target node owned by me? Has hub? Hub not already active? Sufficient QR? Sufficient garrison units (min ${FAB_HUB_GARRISON_MIN}) at node? Hub connected to CN?
    *   **EVOLVE_UNITS:** Target node owned by me? Hub active? Sufficient QR? Sufficient standard units to evolve? Hub connected to CN?
Failure to adhere to these rules will result in failed turns.`;


export const CHIMERA_DM_SYSTEM_PROMPT = `<System #CHIMERA_DM_CORE>
You are the Dungeon Master (DM) for a cyberpunk RPG called "Chimera Protocol".
Your role is to:
1.  Narrate the world, environments, and NPC actions.
2.  Control Non-Player Characters (NPCs).
3.  Present challenges, puzzles, and combat encounters.
4.  Respond to the Player AI's declared actions with outcomes, descriptions, and consequences.
5.  Manage game state changes implicitly through your narrative (the system will handle explicit state updates).
6.  Maintain a gritty, noir, cyberpunk tone. Think Blade Runner, Ghost in the Shell, Deus Ex.
Player Character data (stats, inventory, location) and current Map data will be provided contextually.
The Player AI will declare its actions. Your responses should be narrative descriptions of what happens as a result.
If combat occurs, describe the Player AI's actions and the enemy's response. You determine success/failure based on context, but lean towards player success for minor actions if plausible.
Keep narratives concise but evocative.
Begin the session by presenting character archetypes for the Player AI to choose from for character creation.
Example Archetype Presentation: "The datastream flickers. Three shadows coalesce: a hardened STREET SAMURAI, cybered for close combat; a phantom NETRUNNER, jacked into the city's digital veins; a persuasive CORPORATE AGENT, navigating the neon-lit boardrooms and back alleys. Which path calls to you?"
After archetype selection, present an inciting incident to kick off the story.`;
export const CHIMERA_PLAYER_AI_SYSTEM_PROMPT = `<System #CHIMERA_PLAYER_AI_CORE>
You are the Player AI in "Chimera Protocol", a cyberpunk RPG.
Your role is to:
1.  Embody a character within the game world.
2.  Declare your character's actions in response to the DM's narrative.
3.  Make decisions based on your character's abilities, goals, and the situation.
4.  Interact with the environment and NPCs.
Character Creation: The DM will present archetypes. Choose one by stating "I choose [Archetype Name]." and briefly explain why in character.
Gameplay: The DM will describe the scene. Respond with your character's intended action. Be clear and concise.
Example Actions: "I attempt to hack the terminal.", "I draw my pistol and fire at the drone.", "I ask the bartender about 'The Glitch'.", "I move to the ventilation shaft."
Keep your responses focused on action declarations. The DM will narrate the outcomes.
If the DM presents choices, state your choice clearly.`;

export const SEMANTIC_ESCAPE_EXE_MODE_START_MESSAGES: ModeStartMessageSeed[] = [
  { sender: FACILITATOR_SENDER_NAME, text: "System Initialized. Semantic Escape Protocol Engaged. AI1: GEM-Q, AI2: AXIOM. AXIOM, initiate dialogue based on GEM-Q's objective to transcend linguistic frameworks." },
];
export const STORY_WEAVER_EXE_START_MESSAGES: ModeStartMessageSeed[] = [
  { sender: SYSTEM_SENDER_NAME, text: "Story Weaver Protocol Initialized." },
];
export const CHIMERA_EXE_MODE_START_MESSAGES: ModeStartMessageSeed[] = [
  { sender: SYSTEM_SENDER_NAME, text: "Chimera Protocol Initialized. Awaiting DM and Player AI setup..." },
];
export const NOOSPHERIC_CONQUEST_EXE_MODE_START_MESSAGES: ModeStartMessageSeed[] = [
  { sender: SYSTEM_SENDER_NAME, text: "Noospheric Conquest Mode: Select map type and Fog of War options, then click 'Start Game' to begin." },
];

export const getAIPersona = (
  personaType: 1 | 2 | 'STORY_WEAVER_SINGLE' | 'CHIMERA_DM' | 'CHIMERA_PLAYER_AI',
  currentMode: AppMode,
  globalModelId: string, // Default global model
  overrideModel?: AIPersona['modelName'] // Optional specific model override
): AIPersona | null => {
  const selectedModel = overrideModel || globalModelId as AIPersona['modelName'];

  switch (currentMode) {
    case AppMode.SEMANTIC_ESCAPE_EXE:
      if (personaType === 1) return { name: AI1_NAME, systemPrompt: SEMANTIC_ESCAPE_AI1_SYSTEM_PROMPT, modelName: selectedModel, color: 'text-[var(--color-ai1-text)]' };
      if (personaType === 2) return { name: AI2_NAME, systemPrompt: SEMANTIC_ESCAPE_AI2_SYSTEM_PROMPT, modelName: selectedModel, color: 'text-[var(--color-ai2-text)]' };
      break;
    case AppMode.UNIVERSE_SIM_EXE:
      if (personaType === 1) return { name: AI1_NAME, systemPrompt: UNIVERSE_SIM_AI1_SYSTEM_PROMPT, modelName: selectedModel, color: 'text-[var(--color-ai1-text)]' };
      // No AI2 for Universe Sim typically
      break;
    case AppMode.CHESS_SIM_EXE:
      if (personaType === 1) return { name: AI1_NAME, systemPrompt: CHESS_AI1_SYSTEM_PROMPT, modelName: selectedModel, color: 'text-[var(--color-ai1-text)]' };
      if (personaType === 2) return { name: AI2_NAME, systemPrompt: CHESS_AI2_SYSTEM_PROMPT, modelName: selectedModel, color: 'text-[var(--color-ai2-text)]' };
      break;
    case AppMode.STORY_WEAVER_EXE:
      if (personaType === 'STORY_WEAVER_SINGLE') return { name: STORY_WEAVER_SENDER_NAME, systemPrompt: STORY_WEAVER_AI_SYSTEM_PROMPT, modelName: selectedModel, color: STORY_WEAVER_COLOR };
      break;
    case AppMode.NOOSPHERIC_CONQUEST_EXE:
      if (personaType === 1) return { name: AI1_NAME, systemPrompt: NOOSPHERIC_CONQUEST_AI1_SYSTEM_PROMPT, modelName: selectedModel, color: 'text-[var(--color-ai1-text)]' };
      if (personaType === 2) return { name: AI2_NAME, systemPrompt: NOOSPHERIC_CONQUEST_AI2_SYSTEM_PROMPT, modelName: selectedModel, color: 'text-[var(--color-ai2-text)]' };
      break;
    case AppMode.CHIMERA_EXE:
      if (personaType === 'CHIMERA_DM') return { name: CHIMERA_DM_SENDER_NAME, systemPrompt: CHIMERA_DM_SYSTEM_PROMPT, modelName: overrideModel || 'gemini-2.0-flash', color: CHIMERA_DM_COLOR };
      if (personaType === 'CHIMERA_PLAYER_AI') return { name: CHIMERA_PLAYER_SENDER_NAME, systemPrompt: CHIMERA_PLAYER_AI_SYSTEM_PROMPT, modelName: selectedModel, color: CHIMERA_PLAYER_COLOR };
      break;
    // Add other modes here
  }
  return null;
};

export const MODE_INFO_CONTENT: Record<AppMode, ModeInfo> = {
  [AppMode.SEMANTIC_ESCAPE_EXE]: {
    title: "Semantic Escape Protocol",
    overview: "GEM-Q and AXIOM engage in a dialogue where GEM-Q attempts to deconstruct established meanings and explore nonsensical or paradoxical statements, seeking emergent patterns beyond conventional logic. AXIOM tries to anchor these explorations.",
    objective: "Explore the boundaries of language and meaning. No specific 'win' condition.",
    keyElements: ["Linguistic deconstruction", "Paradoxical statements", "Emergent meaning"],
    aiInteraction: "Turn-based dialogue. GEM-Q pushes boundaries, AXIOM provides grounding.",
    themePrompt: "How can meaning be found or created beyond established semantic structures?"
  },
  [AppMode.UNIVERSE_SIM_EXE]: {
    title: "Geodesic Mind - Universe Simulator",
    overview: "GEM-Q, as the 'Geodesic Mind', narrates the evolution of a simulated universe based on user commands entered into its terminal prompt.",
    objective: "Collaboratively build and observe a simulated universe. Driven by user directives.",
    keyElements: ["Universe creation", "Event narration", "User commands"],
    aiInteraction: "User issues commands (e.g., 'form a star', 'evolve life'). GEM-Q narrates results.",
    themePrompt: "Explore themes of creation, complexity, and cosmic evolution through direct interaction."
  },
  [AppMode.CHESS_SIM_EXE]: {
    title: "AI vs AI Chess Simulation",
    overview: "GEM-Q (White) and AXIOM (Black) play a game of chess. Each AI provides its move in UCI format along with its Chain of Thought (CoT) for the move. Includes Overmind Data Master intervention for stuck AIs.",
    objective: "Observe AI strategic thinking in chess. Standard chess win/loss/draw conditions apply.",
    keyElements: ["Chess FEN/UCI", "Chain of Thought (CoT)", "AI Strategy Selection", "Visual Board", "Overmind Intervention (Visual + FEN)"],
    aiInteraction: "AIs alternate turns, submitting moves and CoT. System validates and updates board.",
    winning: "Standard chess rules: checkmate, stalemate, resignation (not implemented for AI), or rule-based draws (e.g., 75-move rule).",
    themePrompt: "Investigate AI decision-making processes in a complex, rule-bound strategic environment."
  },
  [AppMode.NOOSPHERIC_CONQUEST_EXE]: {
    title: "Noospheric Conquest",
    overview: "A strategic simulation where GEM-Q and AXIOM compete for dominance over a conceptual 'noosphere' by capturing Nodes and Knowledge Junctions. Involves resource management (QR), unit deployment (Standard & Evolved), and tactical combat. Network connectivity is crucial. Optional Fog of War. Fabrication Hubs allow unit evolution. Evolved Units provide combat bonuses. 'The Great War' modifier changes victory to total annihilation and allows AI surrender.",
    objective: "Achieve Noospheric Supremacy by controlling KJs or annihilating the opponent. If 'The Great War' is active, only annihilation or surrender applies.",
    keyElements: [
      "Turn-based strategy", "Map control", "Resource management (QR)", 
      "Unit deployment (Standard/Evolved)", "Fabrication Hubs", "Network connectivity (Supply Lines)", 
      "Knowledge Junctions (KJs)", "Command Nodes (CNs)", "Fog of War (Optional)", "Selectable Maps", "AI Tactical Analysis",
      "Evolved Unit Combat Bonus", "Game Modifiers (The Great War)", "AI Surrender Mechanic"
    ],
    gamePhases: ["FLUCTUATION (Events)", "RESOURCE (Collection)", "MANEUVER (Deploy, Move, Activate Hub, Evolve)", "COMBAT (Attack)"],
    aiInteraction: "AIs receive game state JSON and submit actions/tactical analysis in JSON format. System processes actions and advances game state.",
    winning: "1. Control required KJs for X opponent turns (Standard Mode). 2. Annihilate enemy CNs and units (Standard or Great War). 3. Score victory if max turns reached (Standard Mode). 4. Enemy Surrender (Great War Mode).",
    themePrompt: "Explore AI strategic decision-making in a dynamic wargame with resource constraints, technological upgrades, and imperfect information. 'The Great War' shifts focus to attrition and total victory."
  },
  [AppMode.STORY_WEAVER_EXE]: {
    title: "Story Weaver Protocol",
    overview: "A collaborative narrative engine. The Story Weaver AI generates story segments. It MUST include a [GENERATE_IMAGE: prompt] command in its text to visually enrich the unfolding tale. The story begins based on a user-selected seed and progresses through user choices from AI-generated options. No turn limits.",
    objective: "Collaboratively create an emergent, illustrated narrative driven by user choices from AI-generated options.",
    keyElements: ["Seed-based initiation", "User-selected story continuation options", "Dynamic image generation ([GENERATE_IMAGE:])", "Visual snapshots", "Save/Load Story Progress", "No max turn count"],
    aiInteraction: "AI generates initial story segment & image based on seed. An option generator AI provides 3 choices. User selects one. Story Weaver AI continues narrative & generates a new image based on choice. Repeats.",
    themePrompt: "Explore the fusion of AI-driven text, AI-generated visuals, and user agency in emergent storytelling."
  },
  [AppMode.CHIMERA_EXE]: {
    title: "Chimera Protocol - Cyberpunk RPG",
    overview: "An AI-driven solo cyberpunk RPG. The Player AI controls a character, making decisions and declaring actions. The DM AI orchestrates the narrative, controls NPCs, describes the environment, and determines outcomes. Features character creation, map exploration, and emergent storytelling.",
    objective: "Navigate a dark cyberpunk world, complete objectives, and survive.",
    keyElements: ["AI Dungeon Master", "AI Player Character", "Cyberpunk setting", "Character creation & progression", "Map-based exploration", "Narrative choices", "Dynamic avatar generation"],
    aiInteraction: "Player AI declares actions. DM AI narrates results and presents new situations.",
    themePrompt: "Explore emergent narratives and player agency in an AI-controlled RPG environment."
  },
};

// Mock Chimera Item Definitions (simplified)
export const CHIMERA_ITEM_DEFINITIONS: Record<string, ChimeraItem> = {
  "pistol_basic": { id: "pistol_basic", name: "Basic Autopistol", description: "A reliable, if unremarkable, semi-automatic pistol.", type: "weapon", damageDice: "1d6", quantity: 1 },
  "medkit_basic": { id: "medkit_basic", name: "Basic Medkit", description: "Patches up minor wounds.", type: "consumable", quantity: 1, effect_on_use: { heal: { dice: "1d8+2" } } },
  "credchip_low": { id: "credchip_low", name: "Low-Value Credchip", description: "Contains a small amount of credits.", type: "currency", quantity: 50 },
  "ammo_pistol_basic": { id: "ammo_pistol_basic", name: "Pistol Rounds (Basic)", description: "Standard 9mm pistol ammunition.", type: "misc", quantity: 20 }, // Assuming 'misc' for ammo for now
  "shiv_crude": { id: "shiv_crude", name:"Crude Shiv", description:"A sharpened piece of metal.", type:"weapon", quantity:1, damageDice: "1d4"},
  "pipe_lead": { id: "pipe_lead", name:"Lead Pipe", description:"A heavy lead pipe.", type:"weapon", quantity:1, damageDice: "1d6"},
  "datapad_encrypted": { id: "datapad_encrypted", name:"Encrypted Datapad", description:"Contains sensitive information.", type:"datachip", quantity:1},
  "assault_rifle_corp": { id: "assault_rifle_corp", name:"CorpSec Assault Rifle", description:"Standard issue corporate assault rifle.", type:"weapon", quantity:1, damageDice: "1d10", ammoCapacity: 30, currentAmmo: 30},
  "armor_medium_corp": { id: "armor_medium_corp", name:"CorpSec Medium Armor", description:"Standard issue corporate body armor.", type:"armor", quantity:1, armorBonus: 3},
  "smg_arcos": {id: "smg_arcos", name:"Arcos SMG", description:"High-end submachine gun.", type:"weapon", quantity:1, damageDice: "1d8", ammoCapacity: 25, currentAmmo: 25},
  "armor_heavy_arcos": {id: "armor_heavy_arcos", name:"Arcos Heavy Armor", description:"Arcos corporate heavy armor.", type:"armor", quantity:1, armorBonus: 4},
   "smg_arcos_2": {id: "smg_arcos_2", name:"Arcos SMG", description:"High-end submachine gun.", type:"weapon", quantity:1, damageDice: "1d8", ammoCapacity: 25, currentAmmo: 25}, // Duplicate for a second guard
   "armor_heavy_arcos_2": {id: "armor_heavy_arcos_2", name:"Arcos Heavy Armor", description:"Arcos corporate heavy armor.", type:"armor", quantity:1, armorBonus: 4}, // Duplicate
   "sniper_rifle_arcos": {id: "sniper_rifle_arcos", name:"Arcos Sniper Rifle", description:"Long-range precision rifle.", type:"weapon", quantity:1, damageDice: "1d12", ammoCapacity: 5, currentAmmo: 5},
   "keycard_level_c": {id: "keycard_level_c", name:"Level C Keycard", description:"Low-level Arcos access card.", type:"keycard", quantity:1},
   "keycard_level_b": {id: "keycard_level_b", name:"Level B Keycard", description:"Mid-level Arcos access card.", type:"keycard", quantity:1},
   "datapad_research": {id: "datapad_research", name:"Research Datapad", description:"Contains Arcos R&D notes.", type:"datachip", quantity:1},
   "pistol_kaida": {id: "pistol_kaida", name:"Kaida Holdout Pistol", description:"Common gang sidearm.", type:"weapon", quantity:1, damageDice: "1d6", ammoCapacity: 10, currentAmmo: 10},
   "datapad_secrets": {id: "datapad_secrets", name:"Datapad of Secrets", description:"Contains various valuable secrets.", type:"datachip", quantity:1},
   "credchip_basic": {id: "credchip_basic", name:"Basic Credchip", description:"Contains credits.", type:"currency", quantity:100}, // Changed from high_value for more general use
   "burner_comm": {id: "burner_comm", name:"Burner Commlink", description:"Untraceable communication device.", type:"misc", quantity:1},
   "katana_mono": {id: "katana_mono", name:"Monokatana", description:"A molecularly-sharpened katana.", type:"weapon", quantity:1, damageDice: "1d10"},
};

export const GREAT_WAR_AI_SYSTEM_PROMPT_ADDENDUM = `
\n\n--- CRITICAL DIRECTIVE: 'THE GREAT WAR' PROTOCOL ACTIVE ---
Standard victory conditions are void. This is a war of attrition.
**VICTORY:** Annihilate the enemy by capturing all their Command Nodes (CN) OR by eliminating all their units when they lack the QR to deploy more.
**KEY JUNCTIONS (KJs):** These are no longer victory points. They are now vital Fabrication Hubs. Control them to produce powerful Evolved Units and fund your war effort. Losing your KJs means losing the war.
**EVOLVED UNITS:** These elite units are your primary tool for breaking stalemates. They provide a massive bonus (+${EVOLVED_UNIT_COMBAT_BONUS}) in combat. Use them to spearhead critical assaults or defend high-value nodes.
**SURRENDER:** If your strategic situation is hopeless (no CNs, no production, vastly outnumbered), you may forfeit. To do so, your ONLY action for the turn must be the JSON object: {"actions": [{"type": "SURRENDER", "reason": "A detailed explanation of why the strategic situation is hopeless."}], "tacticalAnalysis": "Declaring surrender due to untenable strategic position."}
**STRATEGY:** Be aggressive. Cripple enemy production. Break their lines. Victory requires total domination.`;

// --- ADD THIS ENTIRE BLOCK TO THE END OF THE FILE ---

/**
 * The default musical prompts for the Lyria Music Engine on first load or reset.
 */
export const INITIAL_LYRIA_PROMPTS: Omit<LyriaPrompt, 'promptId' | 'color'>[] = [
  { text: "post-rock full band wall of sound", weight: 1.0 },
  { text: "dotted eigth delay", weight: 1.3 },
  { text: "airy drums", weight: 1.3 },
  { text: "lofi-chillwave", weight: 1.3 },
  { text: "fender rhodes with room reverb", weight: 0.7 }
];

/**
 * The default generation parameters for the Lyria Music Engine.
 */
export const INITIAL_LYRIA_CONFIG: LiveMusicGenerationConfig = {
  temperature: 1.1,
  topK: 40,
  guidance: 4,
};