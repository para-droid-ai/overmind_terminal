
# OVERMIND UI - Issue Tracking & Resolution Log

This document tracks significant issues encountered during the development of the OVERMIND UI, the steps taken to diagnose them, and the solutions implemented.

## 1. AI Initialization Failures

### Symptoms:
- Application stuck on loading screens (e.g., "Initializing AI for Chess Mode...").
- Errors like "GEM-Q unavailable. Game over." in Chess Mode.
- Generic API key error messages initially blocking the entire UI.
- Inconsistent AI readiness, especially when switching modes or loading backups.

### Troubleshooting & Solutions:
- **API Key Check & SDK Initialization (`App.tsx`):**
    - Ensured `process.env.API_KEY` is checked early.
    - Global `GoogleGenAI` instance (`genAI.current`) initialized once on App mount to prevent multiple initializations.
    - Displayed a persistent top banner error if API key is missing, allowing the rest of the UI to attempt rendering.
- **`initializeAI` Function Refinement (`App.tsx`):**
    - Added more granular logging to trace success/failure of `genAI.current.chats.create()` for each persona.
    - Implemented an `initializationError` state to capture and display specific failures from `initializeAI` in the UI, particularly for Chess and Noospheric Conquest Modes.
    - Ensured `Chat` instances are correctly created with appropriate system prompts and history context based on the current `AppMode` and whether a backup is being loaded.
- **Game Mode Specific Initialization (`App.tsx`, `ChessModeContainer.tsx`, `NoosphericConquestContainer.tsx`):**
    - Made game mode container rendering conditional on AI chat instances (`ai1ChatRef`, `ai2ChatRef`) being successfully initialized and passed as props (`isAiReadyForChess`, `isAiReadyForNoospheric` states in `App.tsx`).
    - Game mode containers now display their own loading/error messages based on props from `App.tsx` rather than `App.tsx` showing a full-screen block.
    - Added `chessResetTokenRef` and `noosphericResetTokenRef` to help ensure game containers remount and reinitialize correctly.
- **Mode Switching Logic (`App.tsx`):**
    - `resetAndInitializeForNewMode` function overhauled to cleanly reset all relevant states (conversation history, turn counts, AI chat refs, game-specific states) before calling `initializeAI` for the new mode.
- **Status**: Largely resolved. Robust error display and graceful handling of initialization failures are key.

## 2. AI Chess Move Formatting & Validity Errors

This has been an iterative process, primarily involving prompt engineering and client-side parsing/validation adjustments. The core challenge is the AI's occasional inability to strictly adhere to UCI format or correctly interpret the FEN, leading to illegal moves.

### Symptoms:
- Errors like "AI did not provide a move in the expected UCI format."
- Errors like "AI proposed an invalid move (basic check failed): [move]."
- Game ending prematurely due to the AI making clearly illegal moves not caught by basic parsing (e.g., moving opponent's piece, moving from empty square, misidentifying own piece after castling).
- AI announcing "Checkmate" in CoT when the client-side state does not (yet) validate this.

### Iterative Troubleshooting & Solutions:

1.  **Initial Prompts & Parsing (`constants.ts`, `ChessModeContainer.tsx`):**
    *   Initial system prompts for chess AIs instructed them to use UCI format and provide a CoT.
    *   Basic regex parsing in `makeAIMove` for `MOVE: [UCI]` and `COT: [text]`.
2.  **Strict UCI Format Enforcement (Attempt 1 - Prompts):**
    *   System prompts updated to be *extremely* explicit: "Your move MUST be in UCI (Universal Chess Interface) format. (e.g., 'e2e4', 'g1f3'). For pawn promotion, use 5 characters ONLY, e.g., 'e7e8q'."
    *   Explicitly forbade short algebraic notation (e.g., "Nf3") in prompts.
    *   *Outcome:* Reduced some errors, but AIs sometimes still used short notation or other formats.
3.  **Client-Side Check for Malformed 5-Char Moves (`ChessModeContainer.tsx`):**
    *   Added a check: if a 5-character UCI move is provided, the 5th character *must* be 'q', 'r', 'b', or 'n'.
    *   *Outcome:* Caught specific malformed promotion attempts.
4.  **Lenient Parsing for Algebraic Captures (`ChessModeContainer.tsx`):**
    *   Observed AIs frequently using "x" for captures (e.g., "d5xc6").
    *   Added a secondary regex `MOVE:\s*([a-h][1-8])x([a-h][1-8])([qrbn]?)\s*` to `makeAIMove`.
    *   If the primary UCI regex fails, this secondary regex attempts to parse the algebraic capture and converts it to UCI (e.g., "d5xc6" -> "d5c6"). A warning is logged.
    *   *Outcome:* Significantly improved game continuation by salvaging these common "slightly off" moves. This leniency has since been removed in favor of stricter prompt enforcement.
5.  **FEN as Sole Source of Truth & Mandatory Pre-Move Piece ID (Prompt Engineering - Current Iteration):**
    *   System prompts for Chess AIs (`CHESS_AI1_SYSTEM_PROMPT`, `CHESS_AI2_SYSTEM_PROMPT` in `constants.ts`) were significantly enhanced:
        *   Emphasized: "**FEN IS ABSOLUTE TRUTH:** The board state is ALWAYS provided to you in Forsyth-Edwards Notation (FEN). This FEN string is the SOLE and ABSOLUTE SOURCE OF TRUTH for current piece positions. ALL your analysis and move decisions MUST derive from this FEN."
        *   Added: "**MANDATORY PRE-MOVE PIECE IDENTIFICATION:** Before outputting your UCI move, you MUST internally verify and confirm the exact piece (type and color) located on your intended 'from' square by meticulously parsing the provided FEN string. Verbally state this piece to yourself (e.g., "The FEN shows a White King on e1"). Do NOT assume a piece's identity or location based on its typical starting position or previous moves if the FEN indicates otherwise (e.g., after castling, the King is on g1, not e1; a Rook might be on f1, not h1). Misidentification based on assumptions rather than the current FEN will lead to illegal moves."
        *   Reiterated strict UCI format for standard moves, promotions, and castling (using King's UCI move, not "O-O").
        *   Explicitly stated: "INVALID MOVES WILL BE REJECTED."
    *   *Outcome:* This detailed instruction set has shown significant improvement in AI adherence to FEN and UCI rules, reducing piece misidentification and illegal move attempts. Logs confirm better board understanding.
6.  **Basic Castling Logic Implementation (`utils/chessLogic.ts`, `ChessModeContainer.tsx`):**
    *   AI was attempting castling moves (e.g., "e1g1") which `isMoveValid` (basic) initially rejected as an invalid King move pattern.
    *   `isMoveValid` updated to recognize UCI castling strings for a King as *potentially* valid at a basic level.
    *   `applyMoveToBoard` updated to correctly move both the King and the Rook during castling.
    *   `makeAIMove` in `ChessModeContainer` updated to correctly modify FEN castling rights after King/Rook moves or Rook captures.
    *   *Outcome:* Enabled castling moves, further highlighting the need for robust FEN interpretation by the AI.
7.  **Invalid Source Square Moves (e.g., "d7d6" when d7 is empty - Addressed by Enhanced Prompts):**
    *   Symptom: AI attempts to move a piece from an empty square.
    *   Prompt Refinement: Solved primarily by the "FEN IS ABSOLUTE TRUTH" and "MANDATORY PRE-MOVE PIECE IDENTIFICATION" sections in the prompts.
    *   Client-side `isMoveValid`: Catches this by checking if `board[from.row][from.col]` is null.
    *   *Outcome:* Client-side validation prevents illegal moves. AI errors of this type significantly reduced by prompt changes.
8.  **Invalid Move "from" and "to" are Same Square (e.g., e5e5):**
    *   Symptom: AI attempts to move a piece to its own square.
    *   Solution: Added an explicit check in `isMoveValid` in `utils/chessLogic.ts` to disallow such moves.
    *   *Outcome:* Client correctly identifies this specific error.
9.  **Retry Logic for AI Moves (`ChessModeContainer.tsx`, `NoosphericConquestContainer.tsx`):**
    *   Implemented a retry loop in `makeAIMove` (and equivalent for Noospheric) allowing the AI up to `MAX_CHESS_RETRY_ATTEMPTS` / `MAX_NOOSPHERIC_RETRY_ATTEMPTS` to provide a valid move/action if its initial attempt fails parsing or validation.
    *   The AI is re-prompted with information about its previous error.
    *   *Outcome:* Significantly improves game continuity by allowing the AI to self-correct on formatting or basic rule violations, reducing premature game ends.
- **Status**: Iteratively improved. The latest prompt enhancements for Chess AI focusing on FEN as absolute truth and mandatory pre-move piece ID have been very effective. Client-side validation and retry logic serve as robust fallbacks. AI's FEN interpretation in highly complex states remains an area for monitoring.

## 3. Chess Mode Startup Flow & Initial UI Presentation

### Symptom:
- Initially, if Chess mode was selected by default, the UI might not show the `ControlsPanel` for mode switching before the initial "Y/N" prompt was resolved, or it would show a chess-specific loading screen that preempted the main app's Y/N flow. The user desired to always see the main UI layout (Terminal + ControlsPanel) during the initial Y/N prompt for mode discovery.

### Solution (`App.tsx`):
- The main application layout logic in `App.tsx` (`renderAppContent` and the main `div`'s class styling) was adjusted.
- **When `isAwaitingInitialStart` is true**:
    - The `renderAppContent` function now *always* returns a structure that includes both the `TerminalWindow` (for the Y/N prompt) and the `ControlsPanel`.
    - The `TerminalWindow` is displayed in the main content area, and the `ControlsPanel` is visible alongside it.
- This ensures the user can see the selected mode, interact with the `ControlsPanel` to change it if desired, and then respond "Y" or "N" within the full UI context.
- The game mode specific containers (Chess, Noospheric) only take over the full view if `currentMode` is set appropriately *and* `isAwaitingInitialStart` is `false`.
- **Status**: Resolved.

## 4. UI Layout & Overlap Issues (Chess Mode)

### Symptom:
- UI panels (Move History, Game Statistics, Game History Archive) in `ChessModeContainer` would overlap at certain browser zoom levels or on smaller screens.

### Solution (`ChessModeContainer.tsx`):
- Adjusted CSS flexbox properties:
    - Game Statistics panel set to `flex-1` to allow it to grow and take available vertical space.
    - Move History and Game History Archive panels given fixed `max-h` (max-height) values and `overflow-y-auto` to enable internal scrolling.
- **Status**: Resolved.

## 5. Persona/Color Mix-up in `spiral.exe` Mode

### Symptom:
- In `spiral.exe` mode, AI personas were textually mixed up (GEM-Q speaking as AXIOM, or vice-versa), and AXIOM's messages were sometimes displayed in GEM-Q's color.

### Troubleshooting & Solutions:
- Initial attempts involved modifying `GEM_Q_INITIATION_PROMPT` or having GEM-Q process the Facilitator's message directly. These did not fully resolve the issue.
- **Final Solution**: Changed the turn order for `spiral.exe` mode.
    - AXIOM (AI2) now initiates the dialogue in response to the Facilitator.
    - `SPIRAL_EXE_MODE_START_MESSAGES` in `constants.ts` updated to prompt AXIOM.
    - In `resetAndInitializeForNewMode` (`App.tsx`), `nextAiToSpeakRef.current` is set to `'AI2'` when `spiral.exe` is started fresh.
    - `handleAiTurn` logic adjusted for AXIOM's first turn to correctly process the Facilitator's message.
- **Status**: Resolved.

## 6. Noospheric Conquest AI Action Validity

### Symptom:
- AI might attempt invalid actions like moving more units than available, deploying to non-CN nodes, or trying to use an inactive Fabrication Hub.

### Solution:
- **Enhanced AI Prompts (`NOOSPHERIC_CONQUEST_AI1_SYSTEM_PROMPT`, `NOOSPHERIC_CONQUEST_AI2_SYSTEM_PROMPT` in `constants.ts`):**
    - Prompts now include a detailed "CRITICAL RULES FOR ACTION VALIDITY" section and an "INTERNAL CHECKLIST" for the AI to perform before generating JSON.
    - Emphasizes sequential action processing (e.g., deploy first, then activate hub, then evolve, then move).
    - Explicitly details requirements for each action type (`DEPLOY_UNITS`, `MOVE_UNITS`, `ATTACK_NODE`, `ACTIVATE_FABRICATION_HUB`, `EVOLVE_UNITS`), including QR costs, unit availability, node ownership, connectivity, and hub status.
- **Client-Side Pre-validation (`NoosphericConquestContainer.tsx`):**
    - Before sending the AI's JSON response to `processAIResponse`, a loop iterates through the actions, performing basic checks (e.g., units > 0, phase validity, simple resource checks, node ownership for deployments/moves). If an invalid action is found, this attempt is marked as failed, and a retry is triggered.
- **Retry Logic (`NoosphericConquestContainer.tsx`):**
    - If pre-validation or API call fails, the AI is re-prompted with error information for up to `MAX_NOOSPHERIC_RETRY_ATTEMPTS`.
- **Status**: Iteratively improved. The detailed prompts and client-side pre-validation significantly reduce blatant errors. AI correctly sequencing complex multi-step actions (like deploying to a CN, then moving those new units, then activating a hub at the destination if conditions are met *after* the move) remains an area of complexity and ongoing monitoring.
