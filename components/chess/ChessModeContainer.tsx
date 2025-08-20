
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Chat, GoogleGenAI, Part, GenerateContentResponse } from '@google/genai';
import html2canvas from 'html2canvas';
import { ChessBoardState, PlayerColor, UCIMove, PieceSymbol, AppMode, ThemeName, ChessGameRecord, ChessMoveDetail, ChessGameOutcome, ChessPiece, ChessSystemLogEntry, LyriaPlaybackState } from '../../types';
import {
    AI1_NAME, AI2_NAME, CHESS_SIM_START_MESSAGE, SYSTEM_SENDER_NAME, THEMES, CHESS_STRATEGIES, MAX_CHESS_RETRY_ATTEMPTS, AVAILABLE_MODELS,
    OVERMIND_DATA_MASTER_SYSTEM_PROMPT, OVERMIND_DATA_MASTER_SENDER_NAME, GEMINI_MULTIMODAL_MODEL_FOR_ODM
} from '../../constants';
import {
    fenToBoard, boardToFen, INITIAL_BOARD_FEN, uciToCoords,
    applyMoveToBoard, isMoveValid, getPieceUnicode, MoveValidationResult, isFenPotentiallyValid
} from '../../utils/chessLogic';
import ChessBoardDisplay from './ChessBoardDisplay';
import CoTDisplay from './CoTDisplay';

interface ChessModeContainerProps {
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

const formatDuration = (ms: number): string => {
    if (ms < 0) ms = 0;
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const tenths = Math.floor((ms % 1000) / 100);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${tenths}`;
};

export const ChessModeContainer: React.FC<ChessModeContainerProps> = ({
  ai1Chat,
  ai2Chat,
  genAI,
  apiKeyMissing,
  initialFen: initialFenProp,
  initialPlayer: initialPlayerProp,
  initialCoTAI1: initialCoTAI1Prop,
  initialCoTAI2: initialCoTAI2Prop,
  initialGameStatus: initialGameStatusProp,
  chessResetToken,
  currentAppMode,
  onModeChange,
  activeTheme,
  onThemeChangeForApp,
  isAiReadyForChessFromApp,
  appInitializationError,
  onOpenInfoModal,
  lyriaPlaybackState,
  onLyriaPlayPause,
  isLyriaReady,
  isEmergencyStopActive,
}) => {
  const [currentFen, setCurrentFen] = useState<string>(initialFenProp || INITIAL_BOARD_FEN);
  const [boardState, setBoardState] = useState<ChessBoardState>(fenToBoard(currentFen).board);
  const [currentPlayer, setCurrentPlayer] = useState<PlayerColor>(initialPlayerProp || PlayerColor.WHITE);
  const [gameStatus, setGameStatus] = useState<string>(initialGameStatusProp || "Select strategies and click 'New Game' to begin.");
  const [isGameStarted, setIsGameStarted] = useState(!!initialGameStatusProp);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [isGamePaused, setIsGamePaused] = useState(false);
  const [isInvokingOvermind, setIsInvokingOvermind] = useState(false);

  const [ai1CoT, setAi1CoT] = useState(initialCoTAI1Prop || "");
  const [ai2CoT, setAi2CoT] = useState(initialCoTAI2Prop || "");
  const [ai1CoTHistory, setAi1CoTHistory] = useState<ChessMoveDetail[]>([]);
  const [ai2CoTHistory, setAi2CoTHistory] = useState<ChessMoveDetail[]>([]);
  const [ai1SuccessTurns, setAi1SuccessTurns] = useState(0);
  const [ai1FailedTurns, setAi1FailedTurns] = useState(0);
  const [ai2SuccessTurns, setAi2SuccessTurns] = useState(0);
  const [ai2FailedTurns, setAi2FailedTurns] = useState(0);

  const [moveHistory, setMoveHistory] = useState<ChessMoveDetail[]>([]);
  const [systemLog, setSystemLog] = useState<ChessSystemLogEntry[]>([]);
  const [capturedPieces, setCapturedPieces] = useState<{ white: ChessPiece[], black: ChessPiece[] }>({ white: [], black: [] });

  const [gameHistoryArchive, setGameHistoryArchive] = useState<ChessGameRecord[]>([]);
  const [sessionGameOutcomes, setSessionGameOutcomes] = useState<ChessGameOutcome[]>([]);
  const [currentStreak, setCurrentStreak] = useState<{ player: PlayerColor | 'draw' | null, count: number }>({ player: null, count: 0 });
  const [longestWhiteStreak, setLongestWhiteStreak] = useState(0);
  const [longestBlackStreak, setLongestBlackStreak] = useState(0);

  const [parsedFenData, setParsedFenData] = useState(fenToBoard(currentFen));
  const lastMoveUciCoords = useRef<UCIMove | null>(null);
  const chessBoardDisplayRef = useRef<HTMLDivElement>(null);
  const originalThemeBeforeOdmRef = useRef<ThemeName>(activeTheme);

  const [ai1Strategy, setAi1Strategy] = useState<string>(CHESS_STRATEGIES[0].id);
  const [ai2Strategy, setAi2Strategy] = useState<string>(CHESS_STRATEGIES[0].id);

  const gameIsOverRef = useRef(false);
  const dataDivRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);
  const currentGameStartTimeRef = useRef<string | null>(null);
  const gameStateRef = useRef({ isPaused: isGamePaused, currentFen: currentFen, currentPlayer: currentPlayer });

  const [currentAiTurnDurationDisplay, setCurrentAiTurnDurationDisplay] = useState<string>("--:--.-");
  const [lastTurnDurationDisplay, setLastTurnDurationDisplay] = useState<string>("--:--.-");
  const [averageTurnTimeDisplay, setAverageTurnTimeDisplay] = useState<string>("--:--.-");
  const [totalGameTimeDisplay, setTotalGameTimeDisplay] = useState<string>("--:--.-");

  const aiTurnStartTimeRef = useRef<number | null>(null);
  const elapsedAiTurnTimeBeforePauseRef = useRef<number>(0);
  const gameStartTimestampRef = useRef<number | null>(null);
  const elapsedGameTimeBeforePauseRef = useRef<number>(0);
  const allTurnDurationsMsRef = useRef<number[]>([]);
  const displayUpdateIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialSetupDoneRef = useRef(false); 

  const isOverallAiReady = isAiReadyForChessFromApp && !!ai1Chat && !!ai2Chat && !apiKeyMissing && !appInitializationError;

  const handleNewGame = useCallback(() => {
    if (isLoadingAI || isInvokingOvermind) return; 
    initialSetupDoneRef.current = false; 
    resetGameRef.current(true); 
    if (isOverallAiReady) {
      setTimeout(() => makeAIMoveRef.current(PlayerColor.WHITE, INITIAL_BOARD_FEN), 100);
    }
  }, [isLoadingAI, isInvokingOvermind, isOverallAiReady]);
  
  const handleNewGameRef = useRef(handleNewGame);
  useEffect(() => { handleNewGameRef.current = handleNewGame; }, [handleNewGame]);


  useEffect(() => {
    gameStateRef.current = { 
        isPaused: isGamePaused,
        currentFen: currentFen,
        currentPlayer: currentPlayer
    };
  }, [isGamePaused, currentFen, currentPlayer]);

  const addSystemLogEntry = useCallback((
    type: ChessSystemLogEntry['type'],
    message: string,
    player?: PlayerColor | typeof OVERMIND_DATA_MASTER_SENDER_NAME
  ) => {
    if (!isMountedRef.current) return;
    setSystemLog(prev => [
        ...prev,
        {
            id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            timestamp: new Date().toISOString(),
            message,
            type,
            player: player 
        }
    ].slice(-100));
  }, []);


  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (displayUpdateIntervalRef.current) clearInterval(displayUpdateIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (dataDivRef.current && isGameStarted) {
      dataDivRef.current.dataset.chessBoardFen = currentFen;
      dataDivRef.current.dataset.chessCurrentPlayer = currentPlayer;
      dataDivRef.current.dataset.chessCoTAI1 = ai1CoT;
      dataDivRef.current.dataset.chessCoTAI2 = ai2CoT;
      dataDivRef.current.dataset.chessGameStatus = gameStatus;
    }
  }, [currentFen, currentPlayer, ai1CoT, ai2CoT, gameStatus, isGameStarted]);


  const updateSessionStats = (outcome: ChessGameOutcome) => {
    setSessionGameOutcomes(prev => [...prev, outcome]);
    if (outcome.winner === PlayerColor.WHITE) {
        if (currentStreak.player === PlayerColor.WHITE) {
            const newCount = currentStreak.count + 1;
            setCurrentStreak({ player: PlayerColor.WHITE, count: newCount});
            setLongestWhiteStreak(prev => Math.max(prev, newCount));
        } else {
            setCurrentStreak({ player: PlayerColor.WHITE, count: 1 });
            setLongestWhiteStreak(prev => Math.max(prev, 1));
        }
    } else if (outcome.winner === PlayerColor.BLACK) {
         if (currentStreak.player === PlayerColor.BLACK) {
            const newCount = currentStreak.count + 1;
            setCurrentStreak({ player: PlayerColor.BLACK, count: newCount});
            setLongestBlackStreak(prev => Math.max(prev, newCount));
        } else {
            setCurrentStreak({ player: PlayerColor.BLACK, count: 1 });
            setLongestBlackStreak(prev => Math.max(prev, 1));
        }
    } else {
        setCurrentStreak({player: 'draw', count: 1});
    }
  };

  const archiveCurrentGame = useCallback((outcome: ChessGameOutcome) => {
    if (!currentGameStartTimeRef.current || gameIsOverRef.current) return; 
    gameIsOverRef.current = true; 
    const gameRecord: ChessGameRecord = {
        id: `game-${Date.now()}`,
        startTime: currentGameStartTimeRef.current,
        endTime: new Date().toISOString(),
        moves: [...moveHistory],
        outcome: outcome,
        ai1StrategyInitial: ai1Strategy,
        ai2StrategyInitial: ai2Strategy,
        finalFEN: gameStateRef.current.currentFen, 
    };
    setGameHistoryArchive(prev => [...prev, gameRecord].slice(-20));
    updateSessionStats(outcome);
    setGameStatus(`Game Over. ${outcome.reason}. Winner: ${outcome.winner === 'draw' ? 'Draw' : (outcome.winner === PlayerColor.WHITE ? AI1_NAME : AI2_NAME)}`);
    addSystemLogEntry('EVENT', `Game Over. ${outcome.reason}. Winner: ${outcome.winner === 'draw' ? 'Draw' : (outcome.winner === PlayerColor.WHITE ? AI1_NAME : AI2_NAME)}`);
    
    if (gameStartTimestampRef.current) {
        const finalTotalGameTime = elapsedGameTimeBeforePauseRef.current + (Date.now() - gameStartTimestampRef.current);
        setTotalGameTimeDisplay(formatDuration(finalTotalGameTime));
    }
    gameStartTimestampRef.current = null;
    aiTurnStartTimeRef.current = null;
    if (displayUpdateIntervalRef.current) clearInterval(displayUpdateIntervalRef.current);
    displayUpdateIntervalRef.current = null;

    addSystemLogEntry('EVENT', `Game archived. New game will start in 3 seconds.`);
    setTimeout(() => {
        if (isMountedRef.current) {
            handleNewGameRef.current();
        }
    }, 3000); 

  }, [moveHistory, ai1Strategy, ai2Strategy, addSystemLogEntry]);

  const applyValidatedMoveToBoard = useCallback((
    moveCoords: UCIMove,
    validationResult: MoveValidationResult,
    playerMoving: PlayerColor,
    fenForThisMove: string,
    moveSource: typeof AI1_NAME | typeof AI2_NAME | typeof OVERMIND_DATA_MASTER_SENDER_NAME,
    cotTextForMove: string,
    strategyForMove: string
  ): string => {
        if (gameIsOverRef.current) { 
            addSystemLogEntry('EVENT', `Attempted to apply move after game ended. Move ignored: ${String.fromCharCode(97 + moveCoords.from.col)}${8 - moveCoords.from.row}${String.fromCharCode(97 + moveCoords.to.col)}${8 - moveCoords.to.row}`, playerMoving);
            return fenForThisMove;
        }
        const currentBoard = fenToBoard(fenForThisMove).board;
        const currentFenParts = fenToBoard(fenForThisMove);
        const newBoardAfterMove = applyMoveToBoard(currentBoard, moveCoords);

        const pieceThatMoved = currentBoard[moveCoords.from.row][moveCoords.from.col];

        let newHalfMoveClockValue = (currentFenParts.halfMove || 0) + 1;
        if (pieceThatMoved?.symbol === PieceSymbol.PAWN || validationResult.isCapture) {
            newHalfMoveClockValue = 0;
        }

        let newEnPassantTargetValue = "-";
        if (pieceThatMoved?.symbol === PieceSymbol.PAWN) {
            const rowDiff = Math.abs(moveCoords.to.row - moveCoords.from.row);
            if (rowDiff === 2) {
                const enPassantRow = playerMoving === PlayerColor.WHITE ? moveCoords.to.row + 1 : moveCoords.to.row - 1;
                newEnPassantTargetValue = `${String.fromCharCode(97 + moveCoords.to.col)}${8 - enPassantRow}`;
            }
        }

        let newCastlingRights = currentFenParts.castling;
        if (pieceThatMoved?.symbol === PieceSymbol.KING) {
            if (playerMoving === PlayerColor.WHITE) newCastlingRights = newCastlingRights.replace('K', '').replace('Q', '');
            else newCastlingRights = newCastlingRights.replace('k', '').replace('q', '');
        } else if (pieceThatMoved?.symbol === PieceSymbol.ROOK) {
            if (playerMoving === PlayerColor.WHITE) {
                if (moveCoords.from.row === 7 && moveCoords.from.col === 0) newCastlingRights = newCastlingRights.replace('Q', '');
                if (moveCoords.from.row === 7 && moveCoords.from.col === 7) newCastlingRights = newCastlingRights.replace('K', '');
            } else {
                if (moveCoords.from.row === 0 && moveCoords.from.col === 0) newCastlingRights = newCastlingRights.replace('q', '');
                if (moveCoords.from.row === 0 && moveCoords.from.col === 7) newCastlingRights = newCastlingRights.replace('k', '');
            }
        }
        if (validationResult.capturedPiece?.symbol === PieceSymbol.ROOK) {
            if (moveCoords.to.row === 0 && moveCoords.to.col === 0) newCastlingRights = newCastlingRights.replace('q', ''); 
            if (moveCoords.to.row === 0 && moveCoords.to.col === 7) newCastlingRights = newCastlingRights.replace('k', ''); 
            if (moveCoords.to.row === 7 && moveCoords.to.col === 0) newCastlingRights = newCastlingRights.replace('Q', ''); 
            if (moveCoords.to.row === 7 && moveCoords.to.col === 7) newCastlingRights = newCastlingRights.replace('K', ''); 
        }
        if (newCastlingRights === "") newCastlingRights = "-";

        const newFullMoveNumberValue = playerMoving === PlayerColor.BLACK ? (currentFenParts.fullMove || 0) + 1 : (currentFenParts.fullMove || 1);
        const nextPlayerTurn = playerMoving === PlayerColor.WHITE ? PlayerColor.BLACK : PlayerColor.WHITE;
        let nextFenForNextPlayer = boardToFen(newBoardAfterMove, nextPlayerTurn, newCastlingRights, newEnPassantTargetValue, newHalfMoveClockValue, newFullMoveNumberValue);

        setBoardState(newBoardAfterMove);
        setCurrentFen(nextFenForNextPlayer);
        setParsedFenData(fenToBoard(nextFenForNextPlayer));
        lastMoveUciCoords.current = moveCoords;

        const moveDetail: ChessMoveDetail = {
          player: playerMoving,
          uci: `${String.fromCharCode(97 + moveCoords.from.col)}${8 - moveCoords.from.row}${String.fromCharCode(97 + moveCoords.to.col)}${8 - moveCoords.to.row}${moveCoords.promotion || ''}`,
          cot: cotTextForMove,
          strategy: strategyForMove,
          moveTimestamp: Date.now(),
          timeTakenMs: aiTurnStartTimeRef.current && moveSource !== OVERMIND_DATA_MASTER_SENDER_NAME ? Date.now() - aiTurnStartTimeRef.current : 0
        };
        setMoveHistory(prev => [...prev, moveDetail]);
        if (playerMoving === PlayerColor.WHITE && moveSource !== OVERMIND_DATA_MASTER_SENDER_NAME) setAi1CoTHistory(prev => [...prev, moveDetail].slice(-20));
        else if (playerMoving === PlayerColor.BLACK && moveSource !== OVERMIND_DATA_MASTER_SENDER_NAME) setAi2CoTHistory(prev => [...prev, moveDetail].slice(-20));

        if (validationResult.isCapture && validationResult.capturedPiece) {
            setCapturedPieces(prev => {
                const newCaptured = { ...prev };
                if (validationResult.capturedPiece!.color === PlayerColor.BLACK) newCaptured.white.push(validationResult.capturedPiece!);
                else newCaptured.black.push(validationResult.capturedPiece!);
                return newCaptured;
            });
            addSystemLogEntry('CAPTURE', `${moveSource} captured ${getPieceUnicode(validationResult.capturedPiece!.symbol, validationResult.capturedPiece!.color)} on ${String.fromCharCode(97 + moveCoords.to.col)}${8 - moveCoords.to.row}.`, playerMoving);
        } else if (pieceThatMoved?.symbol === PieceSymbol.PAWN && currentFenParts.enPassant !== "-" &&
                   uciToCoords(currentFenParts.enPassant)?.to.row === moveCoords.to.row &&
                   uciToCoords(currentFenParts.enPassant)?.to.col === moveCoords.to.col &&
                   Math.abs(moveCoords.from.col - moveCoords.to.col) === 1 &&
                   !currentBoard[moveCoords.to.row][moveCoords.to.col]) {

            const capturedPawnRow = playerMoving === PlayerColor.WHITE ? moveCoords.to.row + 1 : moveCoords.to.row - 1;
            const capturedPawnCol = moveCoords.to.col;
            const epCapturedPieceDetails = currentBoard[capturedPawnRow]?.[capturedPawnCol];
            if (epCapturedPieceDetails && epCapturedPieceDetails.symbol === PieceSymbol.PAWN) {
                newBoardAfterMove[capturedPawnRow][capturedPawnCol] = null; 
                nextFenForNextPlayer = boardToFen(newBoardAfterMove, nextPlayerTurn, newCastlingRights, newEnPassantTargetValue, newHalfMoveClockValue, newFullMoveNumberValue);
                setCurrentFen(nextFenForNextPlayer); 
                setBoardState(newBoardAfterMove);
                setParsedFenData(fenToBoard(nextFenForNextPlayer));

                setCapturedPieces(prev => {
                    const newCaptured = { ...prev };
                    if (epCapturedPieceDetails.color === PlayerColor.BLACK) newCaptured.white.push(epCapturedPieceDetails);
                    else newCaptured.black.push(epCapturedPieceDetails);
                    return newCaptured;
                });
                addSystemLogEntry('CAPTURE', `${moveSource} captured en passant on ${String.fromCharCode(97 + moveCoords.to.col)}${8 - moveCoords.to.row}.`, playerMoving);
            }
        }

        setCurrentPlayer(nextPlayerTurn);
        setGameStatus(`${moveSource} played ${moveDetail.uci}. ${nextPlayerTurn === PlayerColor.WHITE ? AI1_NAME : AI2_NAME} to move.`);
        return nextFenForNextPlayer;
  }, [addSystemLogEntry]);


  const invokeOvermindDataMaster = useCallback(async (
    failingPlayer: PlayerColor,
    fenAtFailure: string,
    lastErrorReason: string,
    failingAiName: string,
    failingAiStrategyId: string
  ) => {
    if (!genAI || !chessBoardDisplayRef.current) {
      addSystemLogEntry('ERROR', "Overmind Data Master cannot be invoked: Missing GenAI instance or board reference.", failingPlayer);
      archiveCurrentGame({ winner: failingPlayer === PlayerColor.WHITE ? PlayerColor.BLACK : PlayerColor.WHITE, reason: "ODM Invocation Error." });
      setIsLoadingAI(false);
      return;
    }

    originalThemeBeforeOdmRef.current = activeTheme;
    onThemeChangeForApp('cyanotype');
    setIsInvokingOvermind(true);
    addSystemLogEntry('EVENT', `${failingAiName} failed all attempts. Consulting Overmind Data Master...`, failingPlayer);
    setGameStatus(`${failingAiName} failed. Consulting Overmind...`);

    let nextFenAfterODM = fenAtFailure;

    try {
      const canvas = await html2canvas(chessBoardDisplayRef.current, {
        scale: 1,
        logging: false,
        useCORS: true,
        backgroundColor: null
      });
      const imageDataUrl = canvas.toDataURL('image/png');
      const base64ImageData = imageDataUrl.split(',')[1];

      const imagePart: Part = { inlineData: { mimeType: 'image/png', data: base64ImageData } };

      let odmPromptText = OVERMIND_DATA_MASTER_SYSTEM_PROMPT;
      odmPromptText = odmPromptText.replace('{{FEN}}', fenAtFailure);
      odmPromptText = odmPromptText.replace(/{{PLAYER_COLOR}}/g, failingPlayer === PlayerColor.WHITE ? "White" : "Black");
      odmPromptText = odmPromptText.replace('{{AI_NAME}}', failingAiName);
      odmPromptText = odmPromptText.replace('{{STRATEGY_NAME}}', CHESS_STRATEGIES.find(s => s.id === failingAiStrategyId)?.name || failingAiStrategyId);
      odmPromptText = odmPromptText.replace('{{LAST_ERROR}}', lastErrorReason.substring(0, 200));

      const textPart: Part = { text: odmPromptText };

      const response = await genAI.models.generateContent({
          model: GEMINI_MULTIMODAL_MODEL_FOR_ODM,
          contents: { parts: [textPart, imagePart] },
      });
      const odmResponseText = response.text;

      if (odmResponseText.trim().toUpperCase() === 'NO_LEGAL_MOVES') {
        addSystemLogEntry('EVENT', "Overmind Data Master confirms: NO_LEGAL_MOVES for " + failingAiName, OVERMIND_DATA_MASTER_SENDER_NAME);
        archiveCurrentGame({ winner: failingPlayer === PlayerColor.WHITE ? PlayerColor.BLACK : PlayerColor.WHITE, reason: `${failingAiName} has no legal moves (confirmed by ODM).` });
      } else {
        const moveMatch = odmResponseText.match(/MOVE:\s*([a-h][1-8][a-h][1-8][qrbn]?)/);
        const cotMatch = odmResponseText.match(/COT:\s*([\s\S]*)/);
        const odmCoT = cotMatch?.[1]?.trim() || "ODM provided a move without detailed CoT.";

        if (moveMatch && moveMatch[1]) {
          const odmUciMove = moveMatch[1];
          const odmMoveCoords = uciToCoords(odmUciMove);
          const currentBoard = fenToBoard(fenAtFailure).board;
          const currentFenParts = fenToBoard(fenAtFailure);

          if (odmMoveCoords) {
            const validationResult = isMoveValid(currentBoard, odmMoveCoords, failingPlayer, currentFenParts.enPassant);
            if (validationResult.isValid) {
              addSystemLogEntry('MOVE', `Overmind Intervention: ${OVERMIND_DATA_MASTER_SENDER_NAME} plays ${odmUciMove} for ${failingAiName}.`, OVERMIND_DATA_MASTER_SENDER_NAME);
              addSystemLogEntry('COT', `${OVERMIND_DATA_MASTER_SENDER_NAME} CoT: ${odmCoT}`, OVERMIND_DATA_MASTER_SENDER_NAME);
              
              nextFenAfterODM = applyValidatedMoveToBoard(
                odmMoveCoords, 
                validationResult, 
                failingPlayer, 
                fenAtFailure, 
                OVERMIND_DATA_MASTER_SENDER_NAME, 
                odmCoT, 
                "Overmind Intervention"
              );

              const { isValid: isFenValidAfterODM, reason: fenInvalidReasonAfterODM } = isFenPotentiallyValid(nextFenAfterODM);
              if (!isFenValidAfterODM) {
                  archiveCurrentGame({ winner: 'draw', reason: `Invalid FEN after ODM move: ${fenInvalidReasonAfterODM || 'Unknown'}` });
              } else {
                  const fenPartsAfterODM = fenToBoard(nextFenAfterODM);
                  if (fenPartsAfterODM.halfMove >= 150) { // Updated to 150 for 75-move rule
                      archiveCurrentGame({ winner: 'draw', reason: '75-move rule after ODM move' });
                  } else {
                      const nextPlayerToMoveAfterODM = failingPlayer === PlayerColor.WHITE ? PlayerColor.BLACK : PlayerColor.WHITE;
                      if (!gameStateRef.current.isPaused && !gameIsOverRef.current) {
                          addSystemLogEntry('EVENT', `Game continues. ${nextPlayerToMoveAfterODM === PlayerColor.WHITE ? AI1_NAME : AI2_NAME} to move.`, OVERMIND_DATA_MASTER_SENDER_NAME);
                          setTimeout(() => {
                              if (isMountedRef.current && !gameStateRef.current.isPaused && !gameIsOverRef.current) {
                                  makeAIMoveRef.current(nextPlayerToMoveAfterODM, nextFenAfterODM);
                              }
                          }, 100);
                      }
                  }
              }
            } else {
              addSystemLogEntry('ERROR', `Overmind Data Master proposed an invalid move (${odmUciMove}): ${validationResult.reason}. Game ends.`, OVERMIND_DATA_MASTER_SENDER_NAME);
              archiveCurrentGame({ winner: failingPlayer === PlayerColor.WHITE ? PlayerColor.BLACK : PlayerColor.WHITE, reason: `ODM proposed invalid move.` });
            }
          } else {
            addSystemLogEntry('ERROR', `Overmind Data Master response move format error: ${odmUciMove}. Game ends.`, OVERMIND_DATA_MASTER_SENDER_NAME);
            archiveCurrentGame({ winner: failingPlayer === PlayerColor.WHITE ? PlayerColor.BLACK : PlayerColor.WHITE, reason: `ODM response format error.` });
          }
        } else {
          addSystemLogEntry('ERROR', `Overmind Data Master did not provide a move in expected format. Response: ${odmResponseText.substring(0,100)}. Game ends.`, OVERMIND_DATA_MASTER_SENDER_NAME);
          archiveCurrentGame({ winner: failingPlayer === PlayerColor.WHITE ? PlayerColor.BLACK : PlayerColor.WHITE, reason: `ODM response error.` });
        }
      }
    } catch (error) {
      console.error("Error during Overmind Data Master invocation:", error);
      addSystemLogEntry('ERROR', `Overmind Data Master invocation failed: ${error instanceof Error ? error.message : "Unknown error"}. Game ends.`, OVERMIND_DATA_MASTER_SENDER_NAME);
      archiveCurrentGame({ winner: failingPlayer === PlayerColor.WHITE ? PlayerColor.BLACK : PlayerColor.WHITE, reason: "ODM System Error." });
    } finally {
      setIsInvokingOvermind(false);
      setIsLoadingAI(false);
       if (aiTurnStartTimeRef.current) {
           const turnDuration = elapsedAiTurnTimeBeforePauseRef.current + (Date.now() - aiTurnStartTimeRef.current);
           setLastTurnDurationDisplay(formatDuration(turnDuration));
           setCurrentAiTurnDurationDisplay(formatDuration(turnDuration));
       }
       aiTurnStartTimeRef.current = null;
       onThemeChangeForApp(originalThemeBeforeOdmRef.current);
    }
  }, [genAI, addSystemLogEntry, archiveCurrentGame, applyValidatedMoveToBoard, activeTheme, onThemeChangeForApp]);


  const makeAIMoveInternal = useCallback(async (player: PlayerColor, fenForThisAIsTurn: string) => {
    if (apiKeyMissing || gameIsOverRef.current || !isOverallAiReady || gameStateRef.current.isPaused || isInvokingOvermind) {
      setIsLoadingAI(false);
      if (apiKeyMissing || !isOverallAiReady) {
        addSystemLogEntry('ERROR', `AI move cannot proceed. apiKeyMissing: ${apiKeyMissing}, isOverallAiReady: ${isOverallAiReady}`, player);
      }
      return;
    }
    
    const { isValid: isFenCurrentlyValid, reason: fenInvalidReason } = isFenPotentiallyValid(fenForThisAIsTurn);
    if (!isFenCurrentlyValid) {
      addSystemLogEntry('ERROR', `Game cannot continue: Invalid FEN before ${player}'s turn (${fenInvalidReason || 'Unknown reason'}). Archiving and restarting.`, player);
      archiveCurrentGame({ winner: 'draw', reason: `Invalid FEN: ${fenInvalidReason || 'Unknown'}` });
      return; 
    }

    setIsLoadingAI(true);
    elapsedAiTurnTimeBeforePauseRef.current = 0;
    aiTurnStartTimeRef.current = Date.now();
    setCurrentAiTurnDurationDisplay(formatDuration(0));

    const aiChat = player === PlayerColor.WHITE ? ai1Chat : ai2Chat;
    const aiName = player === PlayerColor.WHITE ? AI1_NAME : AI2_NAME;
    const setCoTState = player === PlayerColor.WHITE ? setAi1CoT : setAi2CoT;
    const incrementSuccess = player === PlayerColor.WHITE ? () => setAi1SuccessTurns(s => s + 1) : () => setAi2SuccessTurns(s => s + 1);
    const incrementFailure = player === PlayerColor.WHITE ? () => setAi1FailedTurns(f => f + 1) : () => setAi2FailedTurns(f => f + 1);
    const currentStrategyForAI = player === PlayerColor.WHITE ? ai1Strategy : ai2Strategy;

    if (!aiChat) {
      const gameOverMsg = `${aiName} is not available. Game over.`;
      archiveCurrentGame({ winner: player === PlayerColor.WHITE ? PlayerColor.BLACK : PlayerColor.WHITE, reason: `${aiName} unavailable` });
      setIsLoadingAI(false);
      incrementFailure();
      if (aiTurnStartTimeRef.current) {
        const turnDuration = elapsedAiTurnTimeBeforePauseRef.current + (Date.now() - aiTurnStartTimeRef.current);
        setLastTurnDurationDisplay(formatDuration(turnDuration));
        setCurrentAiTurnDurationDisplay(formatDuration(turnDuration));
      }
      aiTurnStartTimeRef.current = null;
      return;
    }

    let moveProcessedThisAttempt = false;
    let lastAttemptErrorReason = "";

    for (let attempt = 0; attempt <= MAX_CHESS_RETRY_ATTEMPTS; attempt++) {
      if (!isMountedRef.current || gameStateRef.current.isPaused || isInvokingOvermind || gameIsOverRef.current) { setIsLoadingAI(false); break; }

      let prompt = `Current FEN: ${fenForThisAIsTurn}\nYour turn (${aiName} as ${player === PlayerColor.WHITE ? "White" : "Black"}). Your strategy: ${CHESS_STRATEGIES.find(s => s.id === currentStrategyForAI)?.name || currentStrategyForAI}. Analyze and provide your move in UCI format and your Chain of Thought (CoT).`;
      if (attempt > 0) {
        prompt += `\nATTENTION: Your previous attempt failed${lastAttemptErrorReason ? `: "${lastAttemptErrorReason}"` : ""}. Please re-evaluate and provide a valid UCI move. Attempt ${attempt + 1}.`;
      }
      lastAttemptErrorReason = "";

      let responseText = "";
      try {
        const response = await aiChat.sendMessage({message:prompt});
        if (!isMountedRef.current || gameStateRef.current.isPaused || isInvokingOvermind || gameIsOverRef.current) { setIsLoadingAI(false); break; }
        responseText = response.text;

        const cotMatch = responseText.match(/COT:\s*([\s\S]*)/);
        const cotTextForCheck = cotMatch && cotMatch[1] ? cotMatch[1].trim() : "";
        
        const iAmCheckmatedRegex = /checkmate(d)?\. (game over|i have no legal moves|i am checkmated)/i;
        const opponentCheckmatedMeRegex = /(black|white) played .* checkmate[\s\S]*game over/i;
        const fenIsInvalidRegex = /fen (is|appears to be) invalid|missing (black|white) king/i;
        let selfDeclaredCheckmate = false;
        let aiDeclaredInvalidFen = false;

        if (iAmCheckmatedRegex.test(cotTextForCheck)) {
            selfDeclaredCheckmate = true;
        } else if (opponentCheckmatedMeRegex.test(cotTextForCheck)) {
            if ((player === PlayerColor.WHITE && /black played .* checkmate/i.test(cotTextForCheck)) ||
                (player === PlayerColor.BLACK && /white played .* checkmate/i.test(cotTextForCheck))) {
                selfDeclaredCheckmate = true;
            }
        }
        if (fenIsInvalidRegex.test(cotTextForCheck)) {
            aiDeclaredInvalidFen = true;
        }

        if (selfDeclaredCheckmate) {
            addSystemLogEntry('EVENT', `${aiName} reported being checkmated in CoT: "${cotTextForCheck.substring(0,100)}..."`, player);
            archiveCurrentGame({ winner: player === PlayerColor.WHITE ? PlayerColor.BLACK : PlayerColor.WHITE, reason: `${aiName} reported being checkmated.` });
            setIsLoadingAI(false);
            if (aiTurnStartTimeRef.current) {
                 const turnDuration = elapsedAiTurnTimeBeforePauseRef.current + (Date.now() - aiTurnStartTimeRef.current);
                 setLastTurnDurationDisplay(formatDuration(turnDuration));
                 setCurrentAiTurnDurationDisplay(formatDuration(turnDuration));
            }
            aiTurnStartTimeRef.current = null;
            return; 
        }
        if (aiDeclaredInvalidFen) {
            addSystemLogEntry('EVENT', `${aiName} reported FEN invalid in CoT: "${cotTextForCheck.substring(0,100)}..."`, player);
            archiveCurrentGame({ winner: 'draw', reason: `${aiName} reported FEN invalid.` });
            setIsLoadingAI(false);
            if (aiTurnStartTimeRef.current) {
                 const turnDuration = elapsedAiTurnTimeBeforePauseRef.current + (Date.now() - aiTurnStartTimeRef.current);
                 setLastTurnDurationDisplay(formatDuration(turnDuration));
                 setCurrentAiTurnDurationDisplay(formatDuration(turnDuration));
            }
            aiTurnStartTimeRef.current = null;
            return;
        }


        const moveMatch = responseText.match(/MOVE:\s*([a-h][1-8][a-h][1-8][qrbn]?)/);
        setCoTState(cotTextForCheck); 
        addSystemLogEntry('COT', `${aiName} CoT: ${cotTextForCheck}`, player);

        if (moveMatch && moveMatch[1]) {
          const uciMoveString = moveMatch[1];
          const moveCoords = uciToCoords(uciMoveString);
          const currentBoardForThisAIMove = fenToBoard(fenForThisAIsTurn).board;
          const currentFenParts = fenToBoard(fenForThisAIsTurn);

          if (moveCoords) {
            const validationResult: MoveValidationResult = isMoveValid(currentBoardForThisAIMove, moveCoords, player, currentFenParts.enPassant);
            if (validationResult.isValid) {
                addSystemLogEntry('MOVE', `${aiName} plays: ${uciMoveString}`, player);
                const strategyNameForMove = CHESS_STRATEGIES.find(s => s.id === currentStrategyForAI)?.name || currentStrategyForAI;
                const nextFenForGame = applyValidatedMoveToBoard(moveCoords, validationResult, player, fenForThisAIsTurn, aiName, cotTextForCheck, strategyNameForMove);

                const { isValid: isFenValidAfterMove, reason: fenInvalidReasonAfterMove } = isFenPotentiallyValid(nextFenForGame);
                if (!isFenValidAfterMove) {
                    archiveCurrentGame({ winner: 'draw', reason: `Invalid FEN after move: ${fenInvalidReasonAfterMove || 'Unknown'}` });
                    setIsLoadingAI(false); return;
                }
                const fenPartsAfterMove = fenToBoard(nextFenForGame);
                if (fenPartsAfterMove.halfMove >= 150) { // Updated to 150 for 75-move rule
                    archiveCurrentGame({ winner: 'draw', reason: '75-move rule' });
                    setIsLoadingAI(false); return;
                }

                setIsLoadingAI(false);
                incrementSuccess();
                moveProcessedThisAttempt = true;

                if (aiTurnStartTimeRef.current) {
                    const turnDuration = elapsedAiTurnTimeBeforePauseRef.current + (Date.now() - aiTurnStartTimeRef.current);
                    setLastTurnDurationDisplay(formatDuration(turnDuration));
                    allTurnDurationsMsRef.current.push(turnDuration);
                    const totalTime = allTurnDurationsMsRef.current.reduce((acc, curr) => acc + curr, 0);
                    setAverageTurnTimeDisplay(formatDuration(allTurnDurationsMsRef.current.length > 0 ? totalTime / allTurnDurationsMsRef.current.length : 0));
                    setCurrentAiTurnDurationDisplay(formatDuration(turnDuration));
                }
                aiTurnStartTimeRef.current = null;

                if (!gameStateRef.current.isPaused && !gameIsOverRef.current) { 
                  const nextPlayerToMove = player === PlayerColor.WHITE ? PlayerColor.BLACK : PlayerColor.WHITE;
                  setTimeout(() => {
                     if (isMountedRef.current && !gameStateRef.current.isPaused && !gameIsOverRef.current) {
                        makeAIMoveRef.current(nextPlayerToMove, nextFenForGame);
                     }
                  }, 100);
                }
                return;
            } else {
                lastAttemptErrorReason = validationResult.reason || "Unknown move validation error.";
                const invalidMoveMsg = `${aiName} proposed an invalid move (${uciMoveString}): ${lastAttemptErrorReason}. Retrying...`;
                addSystemLogEntry('ERROR', `AI Raw Response (Attempt ${attempt + 1} for ${uciMoveString}): ${responseText.substring(0, 200)}${responseText.length > 200 ? '...' : ''}`, player);
                setGameStatus(invalidMoveMsg);
                addSystemLogEntry('ERROR', invalidMoveMsg, player);
            }
          } else {
             lastAttemptErrorReason = "UCI move string could not be parsed into coordinates.";
             const invalidUCIMsg = `${aiName} proposed a malformed UCI move (${uciMoveString}). Retrying...`;
             addSystemLogEntry('ERROR', `AI Raw Response (Attempt ${attempt + 1} for ${uciMoveString}): ${responseText.substring(0, 200)}${responseText.length > 200 ? '...' : ''}`, player);
             setGameStatus(invalidUCIMsg);
             addSystemLogEntry('ERROR', invalidUCIMsg, player);
          }
        } else {
          lastAttemptErrorReason = "Move not provided in expected 'MOVE: [UCI]' format.";
          const noMoveFormatMsg = `${aiName} did not provide a move in the expected UCI format. Retrying...`;
          addSystemLogEntry('ERROR', `AI Raw Response (Attempt ${attempt + 1}): ${responseText.substring(0, 200)}${responseText.length > 200 ? '...' : ''}`, player);
          setGameStatus(noMoveFormatMsg);
          addSystemLogEntry('ERROR', noMoveFormatMsg, player);
        }
      } catch (error) {
        if (!isMountedRef.current || gameStateRef.current.isPaused || isInvokingOvermind || gameIsOverRef.current) { setIsLoadingAI(false); break; }
        console.error(`${aiName} Error:`, error);
        lastAttemptErrorReason = error instanceof Error ? error.message : "Unknown API/Network error.";
        const errorMsg = `${aiName} encountered an error: ${lastAttemptErrorReason}. Retrying...`;
        addSystemLogEntry('ERROR', `AI Raw Response (Attempt ${attempt + 1}): ${responseText.substring(0, 200)}${responseText.length > 200 ? '...' : ''}`, player);
        setGameStatus(errorMsg);
        addSystemLogEntry('ERROR', errorMsg, player);
      }
    }

    if (!moveProcessedThisAttempt && !isInvokingOvermind && !gameStateRef.current.isPaused && !gameIsOverRef.current) {
        invokeOvermindDataMaster(player, fenForThisAIsTurn, lastAttemptErrorReason || "AI failed all direct attempts.", aiName, currentStrategyForAI);
    } else if (!moveProcessedThisAttempt) {
        setIsLoadingAI(false); 
    }

  }, [
    ai1Chat, ai2Chat, apiKeyMissing, ai1Strategy, ai2Strategy, archiveCurrentGame, addSystemLogEntry,
    isOverallAiReady, isInvokingOvermind, invokeOvermindDataMaster, applyValidatedMoveToBoard
  ]);

  const resetGameInternal = useCallback((isStartingNew: boolean = false) => {
    if (!isMountedRef.current) return;
    const initialFenData = fenToBoard(INITIAL_BOARD_FEN);
    setCurrentFen(INITIAL_BOARD_FEN);
    setBoardState(initialFenData.board);
    setParsedFenData(initialFenData);
    setCurrentPlayer(PlayerColor.WHITE);
    setAi1CoT("");
    setAi2CoT("");
    setAi1CoTHistory([]);
    setAi2CoTHistory([]);
    setAi1SuccessTurns(0);
    setAi1FailedTurns(0);
    setAi2SuccessTurns(0);
    setAi2FailedTurns(0);
    setMoveHistory([]);
    setCapturedPieces({ white: [], black: [] });
    lastMoveUciCoords.current = null;
    gameIsOverRef.current = false;
    setIsLoadingAI(false);
    setIsGamePaused(false);
    setIsInvokingOvermind(false);

    if (displayUpdateIntervalRef.current) clearInterval(displayUpdateIntervalRef.current);
    displayUpdateIntervalRef.current = null;
    aiTurnStartTimeRef.current = null;
    elapsedAiTurnTimeBeforePauseRef.current = 0;
    gameStartTimestampRef.current = null;
    elapsedGameTimeBeforePauseRef.current = 0;
    allTurnDurationsMsRef.current = [];
    setCurrentAiTurnDurationDisplay("--:--.-");
    setLastTurnDurationDisplay("--:--.-");
    setAverageTurnTimeDisplay("--:--.-");
    setTotalGameTimeDisplay("--:--.-");


    if (isStartingNew) {
      setGameStatus(CHESS_SIM_START_MESSAGE);
      setIsGameStarted(true);
      currentGameStartTimeRef.current = new Date().toISOString();
      addSystemLogEntry('EVENT', `New game started. ${AI1_NAME} (W) strategy: ${CHESS_STRATEGIES.find(s => s.id === ai1Strategy)?.name || ai1Strategy}. ${AI2_NAME} (B) strategy: ${CHESS_STRATEGIES.find(s => s.id === ai2Strategy)?.name || ai2Strategy}.`);

      gameStartTimestampRef.current = Date.now();
      displayUpdateIntervalRef.current = setInterval(() => {
        if (!isMountedRef.current) return;
        if (gameStateRef.current.isPaused) return;
        if (gameStartTimestampRef.current) {
            const currentTotalElapsed = elapsedGameTimeBeforePauseRef.current + (Date.now() - gameStartTimestampRef.current);
            setTotalGameTimeDisplay(formatDuration(currentTotalElapsed));
        }
        if (aiTurnStartTimeRef.current) {
            const currentTurnElapsed = elapsedAiTurnTimeBeforePauseRef.current + (Date.now() - aiTurnStartTimeRef.current);
            setCurrentAiTurnDurationDisplay(formatDuration(currentTurnElapsed));
        }
      }, 100);

    } else {
      setGameStatus("Select strategies and click 'New Game' to begin.");
      setIsGameStarted(false);
      currentGameStartTimeRef.current = null;
      addSystemLogEntry('EVENT', "Game reset. Select strategies and click 'New Game'.");
    }
  }, [ai1Strategy, ai2Strategy, addSystemLogEntry]);

  const makeAIMoveRef = useRef(makeAIMoveInternal);
  useEffect(() => { makeAIMoveRef.current = makeAIMoveInternal; }, [makeAIMoveInternal]);

  const resetGameRef = useRef(resetGameInternal);
  useEffect(() => { resetGameRef.current = resetGameInternal; }, [resetGameInternal]);

  useEffect(() => {
    const isRestoringFromProps = !!initialGameStatusProp;

    if (isRestoringFromProps) {
        if (displayUpdateIntervalRef.current) clearInterval(displayUpdateIntervalRef.current);
        aiTurnStartTimeRef.current = null;
        elapsedAiTurnTimeBeforePauseRef.current = 0;
        allTurnDurationsMsRef.current = [];
        setCurrentAiTurnDurationDisplay("--:--.-");
        setLastTurnDurationDisplay("--:--.-");
        setAverageTurnTimeDisplay("--:--.-");

        elapsedGameTimeBeforePauseRef.current = 0;
        gameStartTimestampRef.current = Date.now();
        setTotalGameTimeDisplay(formatDuration(0));

        displayUpdateIntervalRef.current = setInterval(() => {
            if (!isMountedRef.current || gameStateRef.current.isPaused) return;
            if (gameStartTimestampRef.current) {
                const currentTotalElapsed = elapsedGameTimeBeforePauseRef.current + (Date.now() - gameStartTimestampRef.current);
                setTotalGameTimeDisplay(formatDuration(currentTotalElapsed));
            }
            if (aiTurnStartTimeRef.current) {
                const currentTurnElapsed = elapsedAiTurnTimeBeforePauseRef.current + (Date.now() - aiTurnStartTimeRef.current);
                setCurrentAiTurnDurationDisplay(formatDuration(currentTurnElapsed));
            }
        }, 100);


        setCurrentFen(initialFenProp || INITIAL_BOARD_FEN);
        const fenData = fenToBoard(initialFenProp || INITIAL_BOARD_FEN);
        setBoardState(fenData.board);
        setParsedFenData(fenData);
        setCurrentPlayer(initialPlayerProp || PlayerColor.WHITE);
        setAi1CoT(initialCoTAI1Prop || "");
        setAi2CoT(initialCoTAI2Prop || "");
        setGameStatus(initialGameStatusProp!);
        setIsGameStarted(true);
        setMoveHistory([]);
        setSystemLog([{id: `sys-restore-${Date.now()}`, timestamp: new Date().toISOString(), message: `Game restored from backup.`, type: 'EVENT'}]);
        setCapturedPieces({ white: [], black: [] });
        lastMoveUciCoords.current = null;
        const gameWasOverInBackup = initialGameStatusProp?.toLowerCase().includes("winner") || initialGameStatusProp?.toLowerCase().includes("draw") || initialGameStatusProp?.toLowerCase().includes("game over");
        gameIsOverRef.current = gameWasOverInBackup;
        setIsLoadingAI(false);
        setIsGamePaused(false);
        setIsInvokingOvermind(false);
        currentGameStartTimeRef.current = new Date().toISOString();

        if (isOverallAiReady && !isGamePaused && !gameIsOverRef.current) {
            const playerToMove = initialPlayerProp || PlayerColor.WHITE;
            const fenToUse = initialFenProp || INITIAL_BOARD_FEN;
            setTimeout(() => {
                if (isMountedRef.current && !gameStateRef.current.isPaused && !gameIsOverRef.current) {
                    makeAIMoveRef.current(playerToMove, fenToUse);
                }
            }, 250);
        }
        initialSetupDoneRef.current = true;
    } else {
        if (!initialSetupDoneRef.current || chessResetToken !== (previousChessResetTokenRef.current || chessResetToken) ) {
             resetGameRef.current(false);
             initialSetupDoneRef.current = true;
        }
    }
    previousChessResetTokenRef.current = chessResetToken;
  }, [
    chessResetToken,
    initialFenProp,
    initialPlayerProp,
    initialCoTAI1Prop,
    initialCoTAI2Prop,
    initialGameStatusProp,
    isOverallAiReady
  ]);
  const previousChessResetTokenRef = useRef(chessResetToken);

  const handlePauseToggle = () => {
    const newPauseState = !isGamePaused;
    setIsGamePaused(newPauseState);
    addSystemLogEntry('EVENT', `Game ${newPauseState ? 'paused' : 'resumed'}.`);

    if (newPauseState) {
        if (aiTurnStartTimeRef.current) {
            elapsedAiTurnTimeBeforePauseRef.current += (Date.now() - aiTurnStartTimeRef.current);
        }
        aiTurnStartTimeRef.current = null;

        if (gameStartTimestampRef.current) {
            elapsedGameTimeBeforePauseRef.current += (Date.now() - gameStartTimestampRef.current);
        }
        gameStartTimestampRef.current = null;

        if (displayUpdateIntervalRef.current) clearInterval(displayUpdateIntervalRef.current);
        displayUpdateIntervalRef.current = null;

    } else {
        if (isGameStarted && !gameIsOverRef.current) {
             if (isLoadingAI) { 
                aiTurnStartTimeRef.current = Date.now();
            }
            gameStartTimestampRef.current = Date.now(); 

            displayUpdateIntervalRef.current = setInterval(() => {
                if (!isMountedRef.current || gameStateRef.current.isPaused) return;
                if (gameStartTimestampRef.current) {
                    const currentTotalElapsed = elapsedGameTimeBeforePauseRef.current + (Date.now() - gameStartTimestampRef.current);
                    setTotalGameTimeDisplay(formatDuration(currentTotalElapsed));
                }
                if (aiTurnStartTimeRef.current) {
                    const currentTurnElapsed = elapsedAiTurnTimeBeforePauseRef.current + (Date.now() - aiTurnStartTimeRef.current);
                    setCurrentAiTurnDurationDisplay(formatDuration(currentTurnElapsed));
                }
            }, 100);
        }

        if (!gameIsOverRef.current && isGameStarted && isOverallAiReady && !isInvokingOvermind) {
            if (!isLoadingAI) { 
                setTimeout(() => {
                  if (isMountedRef.current && !gameStateRef.current.isPaused && !gameIsOverRef.current) {
                    makeAIMoveRef.current(gameStateRef.current.currentPlayer, gameStateRef.current.currentFen);
                  }
                }, 100);
            } 
        }
    }
  };

  const handleExportGameHistoryArchive = () => {
    if (gameHistoryArchive.length === 0) return;
    const dataStr = JSON.stringify(gameHistoryArchive, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `chess_game_archive_${new Date().toISOString().split('T')[0]}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    linkElement.remove();
    addSystemLogEntry('EVENT', 'Game history archive exported.');
  };

  const SidebarPanel: React.FC<{ title: string, children: React.ReactNode, className?: string }> = ({ title, children, className }) => (
    <div className={`bg-[var(--color-bg-terminal)] border-2 border-[var(--color-border-base)] rounded p-2 shadow-sm ${className}`}>
      <h4 className="text-xs font-semibold text-[var(--color-text-heading)] border-b border-[var(--color-border-strong)] pb-1 mb-1.5">{title}</h4>
      {children}
    </div>
  );

  const whiteWins = sessionGameOutcomes.filter(g => g.winner === PlayerColor.WHITE).length;
  const blackWins = sessionGameOutcomes.filter(g => g.winner === PlayerColor.BLACK).length;
  const draws = sessionGameOutcomes.filter(g => g.winner === 'draw').length;
  const totalSessionGames = sessionGameOutcomes.length;

  const strategySelectDisabled = isLoadingAI || isInvokingOvermind || (isGameStarted && !isGamePaused && !gameIsOverRef.current);

  return (
    <div className="flex flex-col h-full w-full bg-[var(--color-bg-page)] text-[var(--color-text-base)] p-1 md:p-2 overflow-hidden">
      <div ref={dataDivRef} id="chess-mode-container-data" style={{ display: 'none' }}></div>
      <header className="w-full flex-shrink-0 p-2 mb-1 bg-[var(--color-bg-panel)] rounded-md shadow-md border-2 border-[var(--color-border-strong)] flex flex-col sm:flex-row justify-between items-center">
        <h1 className="text-md md:text-lg font-bold text-[var(--color-text-heading)] mb-2 sm:mb-0">AI vs AI Chess Simulation</h1>
        <div className="flex items-center space-x-1 sm:space-x-2">
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
          <button onClick={() => handleNewGameRef.current()} disabled={isLoadingAI || isInvokingOvermind || !isOverallAiReady}
            className="px-2 py-1 bg-[var(--color-bg-button-primary)] text-[var(--color-text-button-primary)] rounded hover:bg-[var(--color-bg-button-primary-hover)] focus-ring-primary text-xs font-semibold disabled:opacity-50">
            New Game
          </button>
          <div className="control-group flex items-center">
            <label htmlFor="chessAppModeSelectHeader" className="sr-only">Mode:</label>
            <select
                id="chessAppModeSelectHeader"
                value={currentAppMode}
                onChange={(e) => onModeChange(e.target.value as AppMode)}
                className="bg-[var(--color-bg-dropdown)] border border-[var(--color-border-input)] text-[var(--color-text-base)] p-1 rounded-sm text-[10px] focus-ring-accent"
                title="Change simulation mode"
            >
                {Object.values(AppMode).map(mode => ( <option key={mode} value={mode}>{mode}</option>))}
            </select>
          </div>
          <button onClick={handlePauseToggle} disabled={!isGameStarted || gameIsOverRef.current}
            className="px-2 py-1 bg-[var(--color-bg-button-secondary)] text-[var(--color-text-button-secondary)] rounded hover:bg-[var(--color-bg-button-secondary-hover)] focus-ring-accent text-xs disabled:opacity-50">
            {isGamePaused ? 'Resume' : 'Pause'}
          </button>
          <button
            onClick={onOpenInfoModal}
            title="About Chess Simulation Mode"
            className="p-0.5 rounded-full hover:bg-[var(--color-bg-button-secondary-hover)] focus-ring-accent"
            aria-label="Show information about Chess mode"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-[var(--color-accent-300)]">
              <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
            </svg>
          </button>
        </div>
      </header>

      <div className="flex flex-row flex-grow min-h-0 p-1 gap-1">
        <main className="w-3/4 flex flex-col space-y-1 h-full">
          <div className="text-center py-1 text-[var(--color-text-muted)] text-sm border-b border-[var(--color-border-strong)] flex-shrink-0">
            {isInvokingOvermind ? `${gameStatus} (Overmind Analyzing...)` : gameStatus}
            {isLoadingAI && !isGamePaused && !isInvokingOvermind && <span className="animate-pulse ml-2">AI Thinking...</span>}
          </div>
          <div className="flex-grow flex items-center justify-center p-1 min-h-0" ref={chessBoardDisplayRef}>
            <ChessBoardDisplay board={boardState} lastMove={lastMoveUciCoords.current} />
          </div>
          <div className="grid grid-cols-2 gap-1 h-44 flex-shrink-0">
            <CoTDisplay
              title={`${AI1_NAME} (White)`}
              currentCot={ai1CoT}
              history={ai1CoTHistory}
              isLoading={isLoadingAI && currentPlayer === PlayerColor.WHITE && !isInvokingOvermind}
              playerNameColor="text-[var(--color-ai1-text)]"
              successTurns={ai1SuccessTurns}
              failedTurns={ai1FailedTurns}
            />
            <CoTDisplay
              title={`${AI2_NAME} (Black)`}
              currentCot={ai2CoT}
              history={ai2CoTHistory}
              isLoading={isLoadingAI && currentPlayer === PlayerColor.BLACK && !isInvokingOvermind}
              playerNameColor="text-[var(--color-ai2-text)]"
              successTurns={ai2SuccessTurns}
              failedTurns={ai2FailedTurns}
            />
          </div>
        </main>

        <aside className="w-1/4 flex flex-col space-y-1 bg-[var(--color-bg-panel)] border-l-2 border-[var(--color-border-base)] p-1 overflow-y-auto log-display custom-scrollbar">
          <SidebarPanel title="AI Strategy & Captured">
             <div className="grid grid-cols-2 gap-x-2 text-xs">
              <div>
                <label htmlFor="ai1Strategy" className="block text-[var(--color-ai1-text)] text-[10px] font-semibold">{AI1_NAME} (White):</label>
                <span className="text-[var(--color-text-muted)] text-[10px] block mb-0.5">Strategy:</span>
                <select id="ai1Strategy" value={ai1Strategy}
                  onChange={e => {
                    setAi1Strategy(e.target.value);
                    if(isGameStarted && !isGamePaused && !gameIsOverRef.current) addSystemLogEntry('STRATEGY', `${AI1_NAME} strategy will change to: ${CHESS_STRATEGIES.find(s => s.id === e.target.value)?.name || e.target.value} on next opportunity.`);
                  }}
                  disabled={strategySelectDisabled}
                  className="w-full text-[10px] p-0.5 bg-[var(--color-bg-dropdown)] border border-[var(--color-border-input)] rounded-sm focus-ring-accent disabled:opacity-70 disabled:cursor-not-allowed">
                  {CHESS_STRATEGIES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <div className="mt-1 text-[var(--color-text-muted)] text-[10px]">Pieces Captured:
                    <div className="flex flex-wrap gap-0.5 mt-0.5" aria-label="Pieces captured by White">
                      {capturedPieces.white.length === 0 && <span className="italic">None</span>}
                      {capturedPieces.white.map((p, i) =>
                        <span key={`cap-w-${i}`} className="text-sm" style={{ color: p.color === PlayerColor.BLACK ? (THEMES[activeTheme]?.ai2TextColor || '#333') : (THEMES[activeTheme]?.ai1TextColor || '#FFF'), filter: p.color === PlayerColor.WHITE ? 'drop-shadow(0 0 1px #000)' : 'drop-shadow(0 0 1px #FFF)'}}>
                           {getPieceUnicode(p.symbol, p.color)}
                        </span>
                      )}
                    </div>
                </div>
              </div>
              <div>
                <label htmlFor="ai2Strategy" className="block text-[var(--color-ai2-text)] text-[10px] font-semibold">{AI2_NAME} (Black):</label>
                 <span className="text-[var(--color-text-muted)] text-[10px] block mb-0.5">Strategy:</span>
                <select id="ai2Strategy" value={ai2Strategy}
                  onChange={e => {
                    setAi2Strategy(e.target.value);
                     if(isGameStarted && !isGamePaused && !gameIsOverRef.current) addSystemLogEntry('STRATEGY', `${AI2_NAME} strategy will change to: ${CHESS_STRATEGIES.find(s => s.id === e.target.value)?.name || e.target.value} on next opportunity.`);
                  }}
                  disabled={strategySelectDisabled}
                  className="w-full text-[10px] p-0.5 bg-[var(--color-bg-dropdown)] border border-[var(--color-border-input)] rounded-sm focus-ring-accent disabled:opacity-70 disabled:cursor-not-allowed">
                  {CHESS_STRATEGIES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                 <div className="mt-1 text-[var(--color-text-muted)] text-[10px]">Pieces Captured:
                    <div className="flex flex-wrap gap-0.5 mt-0.5" aria-label="Pieces captured by Black">
                        {capturedPieces.black.length === 0 && <span className="italic">None</span>}
                        {capturedPieces.black.map((p, i) =>
                          <span key={`cap-b-${i}`} className="text-sm" style={{ color: p.color === PlayerColor.BLACK ? (THEMES[activeTheme]?.ai2TextColor || '#333') : (THEMES[activeTheme]?.ai1TextColor || '#FFF'), filter: p.color === PlayerColor.WHITE ? 'drop-shadow(0 0 1px #000)' : 'drop-shadow(0 0 1px #FFF)'}}>
                            {getPieceUnicode(p.symbol, p.color)}
                          </span>
                        )}
                    </div>
                </div>
              </div>
            </div>
          </SidebarPanel>

          <SidebarPanel title="Move History (Current Game)" className="flex-shrink-0 max-h-32 overflow-y-auto custom-scrollbar">
            <ol className="list-none text-xs space-y-0.5 overflow-y-auto max-h-full pr-1 custom-scrollbar">
              {moveHistory.length === 0 && <li className="italic text-[var(--color-text-muted)] list-none">No moves yet.</li>}
              {moveHistory.slice().reverse().map((move, index) => (
                <li key={move.moveTimestamp + move.uci} className={`${move.player === PlayerColor.WHITE ? 'text-[var(--color-ai1-text)]' : 'text-[var(--color-ai2-text)]'} opacity-90`}>
                  {`${moveHistory.length - index}. `}
                  {move.uci}
                </li>
              ))}
            </ol>
          </SidebarPanel>

          <SidebarPanel title="System Log" className="flex-shrink-0 max-h-40 overflow-y-auto custom-scrollbar">
            <ul className="text-xs space-y-0.5 overflow-y-auto max-h-full pr-1 custom-scrollbar">
              {systemLog.length === 0 && <li className="italic text-[var(--color-text-muted)]">No system events yet.</li>}
              {systemLog.slice().reverse().map(entry => {
                  let textColor = 'text-[var(--color-text-muted)]';
                  if (entry.type === 'ERROR') textColor = 'text-[var(--color-error)]';
                  else if (entry.type === 'CAPTURE') textColor = 'text-green-400';
                  else if (entry.type === 'STRATEGY') textColor = 'text-yellow-400';
                  else if (entry.type === 'EVENT') textColor = 'text-[var(--color-system-message)]';
                  else if (entry.player === PlayerColor.WHITE) textColor = 'text-[var(--color-ai1-text)]';
                  else if (entry.player === PlayerColor.BLACK) textColor = 'text-[var(--color-ai2-text)]';
                  else if (entry.player === OVERMIND_DATA_MASTER_SENDER_NAME) textColor = 'text-purple-400';


                  return (
                      <li key={entry.id} className={`${textColor} opacity-90 leading-snug`}>
                          {entry.message}
                      </li>
                  );
              })}
            </ul>
          </SidebarPanel>

          <SidebarPanel title="Game Statistics (Current Session)" className="flex-grow min-h-[150px] overflow-y-auto custom-scrollbar">
            <div className="text-xs space-y-0.5">
                <p>Total Moves (Game): {moveHistory.length}</p>
                <p>FullMove Clock: {parsedFenData.fullMove}</p>
                <p>HalfMove Clock: {parsedFenData.halfMove}</p>
                <p>Castling: {parsedFenData.castling}</p>
                <p>En Passant: {parsedFenData.enPassant === '-' ? 'None' : parsedFenData.enPassant}</p>
                <hr className="my-1 border-[var(--color-border-strong)] opacity-30"/>
                <p>Last Turn Length: <span className="font-semibold text-[var(--color-accent-400)]">{lastTurnDurationDisplay}</span></p>
                <p>Current Turn Time: <span className="font-semibold text-[var(--color-accent-300)]">{currentAiTurnDurationDisplay}</span></p>
                <p>Average Turn Time: <span className="font-semibold text-[var(--color-text-muted)]">{averageTurnTimeDisplay}</span></p>
                <p>Total Game Time: <span className="font-semibold text-[var(--color-info)]">{totalGameTimeDisplay}</span></p>
                <hr className="my-1 border-[var(--color-border-strong)] opacity-30"/>
                <p>White Wins ({AI1_NAME}): {whiteWins} ({totalSessionGames > 0 ? (whiteWins/totalSessionGames*100).toFixed(1) : 0.0}%)</p>
                <p>Black Wins ({AI2_NAME}): {blackWins} ({totalSessionGames > 0 ? (blackWins/totalSessionGames*100).toFixed(1) : 0.0}%)</p>
                <p>Draws: {draws} ({totalSessionGames > 0 ? (draws/totalSessionGames*100).toFixed(1) : 0.0}%)</p>
                <p>Current Streak: {currentStreak.player ? `${currentStreak.player === 'w' ? AI1_NAME : (currentStreak.player === 'b' ? AI2_NAME : 'Draws') } - ${currentStreak.count}` : 'None'}</p>
                <p>Longest White Streak: {longestWhiteStreak}</p>
                <p>Longest Black Streak: {longestBlackStreak}</p>
            </div>
          </SidebarPanel>

          <SidebarPanel title="Game History Archive" className="flex-shrink-0 mt-auto max-h-24 overflow-y-auto custom-scrollbar">
            <div className="text-xs space-y-0.5 overflow-y-auto max-h-full pr-1">
              {gameHistoryArchive.length === 0 && <p className="italic text-[var(--color-text-muted)]">No games archived yet.</p>}
              {gameHistoryArchive.map(game => (
                <div key={game.id} className="border-b border-dashed border-[var(--color-border-base)] border-opacity-30 pb-0.5 mb-0.5">
                  <p>ID: <span className="text-[var(--color-text-muted)]">{game.id.substring(game.id.length-4)}</span>, Outcome: <span className={game.outcome.winner === PlayerColor.WHITE ? "text-[var(--color-ai1-text)]" : game.outcome.winner === PlayerColor.BLACK ? "text-[var(--color-ai2-text)]" : ""}>{game.outcome.winner === 'draw' ? 'Draw' : `${game.outcome.winner === PlayerColor.WHITE ? AI1_NAME : AI2_NAME} Won`}</span> ({game.moves.length} moves)</p>
                </div>
              ))}
            </div>
            <button
              onClick={handleExportGameHistoryArchive}
              disabled={gameHistoryArchive.length === 0}
              className="w-full mt-1 text-[10px] p-0.5 bg-[var(--color-bg-button-secondary)] text-[var(--color-text-button-secondary)] rounded hover:bg-[var(--color-bg-button-secondary-hover)] disabled:opacity-50 disabled:cursor-not-allowed focus-ring-accent"
            >
              Export All
            </button>
          </SidebarPanel>
        </aside>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--color-scrollbar-thumb-hover); border-radius: 3px; }
        .custom-scrollbar { scrollbar-width: thin; scrollbar-color: var(--color-scrollbar-thumb-hover) rgba(0,0,0,0.2); }
      ` }} />
    </div>
  );
};
