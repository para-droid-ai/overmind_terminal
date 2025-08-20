
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleGenAI, Chat, Content, Part, GenerateContentResponse, LiveMusicSession, LiveMusicServerMessage, Scale } from "@google/genai";
import MatrixBackground from './components/MatrixBackground';
import TerminalWindow from './components/TerminalWindow';
import ControlsPanel from './components/ControlsPanel';
import { ChessModeContainer } from './components/chess/ChessModeContainer'; 
import NoosphericConquestContainer from './components/noospheric/NoosphericConquestContainer'; 
import StoryWeaverModeContainer from './components/story_weaver/StoryWeaverModeContainer';
import ChimeraModeContainer from './components/chimera/ChimeraModeContainer';
import InfoModal from './components/InfoModal';
import {
  AIPersona, MatrixSettings, ChatMessage, ImageSnapshot, StorySeed, StoryOption,
  ConversationBackup, AppMode, ModeStartMessageSeed, InterventionTarget, ThemeName, PlayerColor, SenderName,
  NoosphericGameState, NoosphericMapType, ChimeraGameState, StoryWeaverModeContainerProps, ChimeraModeContainerProps,
  LyriaPrompt, LiveMusicGenerationConfig, LyriaPlaybackState, LyriaSessionBackup
} from './types';
import {
  DEFAULT_MATRIX_SPEED, AI1_NAME, AI2_NAME, STORY_WEAVER_SENDER_NAME,
  USER_PROMPT_MESSAGE, SYSTEM_SENDER_NAME,
  getAIPersona,
  SEMANTIC_ESCAPE_EXE_MODE_START_MESSAGES,
  FACILITATOR_SENDER_NAME, USER_INTERVENTION_SENDER_NAME,
  INITIAL_START_PROMPT_MESSAGE, UNIVERSE_SIM_EXE_INITIATION_TRIGGER, CHESS_SIM_START_MESSAGE,
  NOOSPHERIC_CONQUEST_START_MESSAGE,
  DEFAULT_TYPING_SPEED_MS,
  THEMES, STORY_WEAVER_COLOR,
  STORY_WEAVER_EXE_START_MESSAGES,
  CHIMERA_EXE_MODE_START_MESSAGES,
  MODE_INFO_CONTENT, GEMINI_MODEL_NAME_FLASH_DEFAULT, IMAGEN_MODEL_NAME,
  CHIMERA_DM_SENDER_NAME, CHIMERA_PLAYER_SENDER_NAME, AVAILABLE_MODELS, CHIMERA_FACILITATOR_PROMPT_MESSAGE,
  GEM_Q_INITIATION_PROMPT, MAX_TURN_CYCLES, NOOSPHERIC_CONQUEST_EXE_MODE_START_MESSAGES,
  STORY_GENRES, STORY_CHARACTERS, STORY_SETTINGS, STORY_CONFLICTS_OR_ITEMS, STORY_KEYWORDS,
  STORY_OPTION_GENERATOR_SYSTEM_PROMPT, STORY_WEAVER_AI_SYSTEM_PROMPT,
  MAX_LYRIA_PROMPTS, LYRIA_PROMPT_COLORS, LYRIA_MODEL_NAME,
  INITIAL_LYRIA_PROMPTS, INITIAL_LYRIA_CONFIG
} from './constants';
import { INITIAL_BOARD_FEN, fenToBoard } from './utils/chessLogic';

const IMAGE_GEN_COMMAND_REGEX = /\[GENERATE_IMAGE:\s*([^\]]+)\]/gim;
const CUSTOM_API_KEY_STORAGE_KEY = 'overmind_custom_gemini_api_key';

type ApiKeySource = 'custom' | 'environment' | 'missing';


// Utilities (can be moved to a separate file)
function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeLyriaAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 48000,
  numChannels: number = 2
): Promise<AudioBuffer> {
  console.log('[Lyria] Decoding audio data chunk, length:', data.length);
  const buffer = ctx.createBuffer(
    numChannels,
    data.length / 2 / numChannels,
    sampleRate,
  );

  const dataInt16 = new Int16Array(data.buffer);
  const l = dataInt16.length;
  const dataFloat32 = new Float32Array(l);
  for (let i = 0; i < l; i++) {
    dataFloat32[i] = dataInt16[i] / 32768.0;
  }

  if (numChannels === 0) { // Should be numChannels === 1 based on Lyria docs for mono
    buffer.copyToChannel(dataFloat32, 0);
  } else { 
    for (let i = 0; i < numChannels; i++) {
      const channelData = new Float32Array(dataFloat32.length / numChannels);
      for (let j = 0; j < channelData.length; j++) {
        channelData[j] = dataFloat32[j * numChannels + i];
      }
      buffer.copyToChannel(channelData, i);
    }
  }
  console.log('[Lyria] Audio data decoded into AudioBuffer.');
  return buffer;
}

function throttle<T extends (...args: any[]) => any>(func: T, delay: number): T {
  let lastCall = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return ((...args: Parameters<T>): ReturnType<T> | undefined => {
    const now = Date.now();
    const remaining = delay - (now - lastCall);

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (remaining <= 0) {
      lastCall = now;
      return func(...args);
    } else {
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        timeoutId = null;
        func(...args);
      }, remaining);
    }
  }) as T;
}


const App: React.FC = () => {
  const [activeTheme, setActiveTheme] = useState<ThemeName>('terminal');
  const [globalSelectedModelId, setGlobalSelectedModelId] = useState<string>(AVAILABLE_MODELS[0].id);

  const [matrixSettings, setMatrixSettings] = useState<MatrixSettings>({
    speed: DEFAULT_MATRIX_SPEED,
    glitchEffect: true,
    isPaused: false,
    matrixColor: THEMES.terminal.matrixColor,
  });
  const [fps, setFps] = useState(0);
  const [typingSpeedMs, setTypingSpeedMs] = useState<number>(DEFAULT_TYPING_SPEED_MS);

  const [currentMode, setCurrentMode] = useState<AppMode>(AppMode.SEMANTIC_ESCAPE_EXE); 
  const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTypingMessageId, setCurrentTypingMessageId] = useState<string | null>(null);
  const [activeAINameForLoading, setActiveAINameForLoading] = useState<string | null>(null);

  const [isAwaitingUserInput, setIsAwaitingUserInput] = useState(false);
  const [userInputText, setUserInputText] = useState("");

  const [isAwaitingInitialStart, setIsAwaitingInitialStart] = useState(true);
  const [initialStartInputText, setInitialStartInputText] = useState("");
  const [universeSimInputText, setUniverseSimInputText] = useState("");

  const [turnCycleCount, setTurnCycleCount] = useState(0);
  const [storyWeaverTurnCount, setStoryWeaverTurnCount] = useState(0); 
  
  const [userDefinedApiKey, setUserDefinedApiKey] = useState<string | null>(null);
  const [activeApiKeySource, setActiveApiKeySource] = useState<ApiKeySource>('missing');
  const [apiKeyMissingError, setApiKeyMissingError] = useState<boolean>(false); 
  const [initializationError, setInitializationError] = useState<string | null>(null);


  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const commandHistoryIndexRef = useRef<number>(-1);

  const [forceTurnCheckToken, setForceTurnCheckToken] = useState(0);
  const [isAiReadyForChess, setIsAiReadyForChess] = useState(false);
  const [isAiReadyForNoospheric, setIsAiReadyForNoospheric] = useState(false);
  const [isAiReadyForChimera, setIsAiReadyForChimera] = useState(false);

  const [chessInitialFen, setChessInitialFen] = useState<string>(INITIAL_BOARD_FEN);
  const [chessInitialPlayer, setChessInitialPlayer] = useState<PlayerColor | undefined>(undefined);
  const [chessInitialCoTAI1, setChessInitialCoTAI1] = useState<string>("");
  const [chessInitialCoTAI2, setChessInitialCoTAI2] = useState<string>("");
  const [chessInitialGameStatus, setChessInitialGameStatus] = useState<string | undefined>(undefined);
  const chessResetTokenRef = useRef(0);

  const [noosphericInitialState, setNoosphericInitialState] = useState<NoosphericGameState | undefined>(undefined);
  const [noosphericInitialMapType, setNoosphericInitialMapType] = useState<NoosphericMapType | undefined>(undefined);
  const [noosphericGameStartedFromBackup, setNoosphericGameStartedFromBackup] = useState(false);
  const noosphericResetTokenRef = useRef(0);

  const storyWeaverChatRef = useRef<Chat | null>(null);
  const storyOptionGeneratorChatRef = useRef<Chat | null>(null);
  const [imageSnapshots, setImageSnapshots] = useState<ImageSnapshot[]>([]);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [processedImageCommandMessageIds, setProcessedImageCommandMessageIds] = useState<Set<string>>(new Set());
  const [storySeeds, setStorySeeds] = useState<StorySeed[]>([]);
  const [selectedStorySeed, setSelectedStorySeed] = useState<StorySeed | null>(null);
  const [isAwaitingSeedChoice, setIsAwaitingSeedChoice] = useState<boolean>(false);
  const [lastGeneratedImageForStoryWeaver, setLastGeneratedImageForStoryWeaver] = useState<{ mimeType: string; data: string; } | null>(null);
  const [storyContinuationOptions, setStoryContinuationOptions] = useState<StoryOption[]>([]);
  const [isAwaitingStoryContinuationChoice, setIsAwaitingStoryContinuationChoice] = useState<boolean>(false);


  const chimeraDmAiChatRef = useRef<Chat | null>(null);
  const chimeraPlayerAiChatRef = useRef<Chat | null>(null);
  const [chimeraInitialGameState, setChimeraInitialGameState] = useState<ChimeraGameState | undefined>(undefined);
  const chimeraResetTokenRef = useRef(0);

  const ai1ChatRef = useRef<Chat | null>(null);
  const ai2ChatRef = useRef<Chat | null>(null);
  const nextAiToSpeakRef = useRef<'AI1' | 'AI2' | 'STORY_WEAVER'>('AI1');

  const isUserInterventionPendingRef = useRef(false);
  const pendingInterventionTextRef = useRef<string | null>(null);
  const interventionTargetForPendingRef = useRef<InterventionTarget | null>(null);

  const queuedInterventionForAI1Ref = useRef<string | null>(null);
  const queuedInterventionForAI2Ref = useRef<string | null>(null);

  const genAI = useRef<GoogleGenAI | null>(null); // For general API calls
  const lyriaAiInstanceRef = useRef<GoogleGenAI | null>(null); // Specific for Lyria with v1alpha

  const genAIInstanceInitialized = useRef(false);
  const wasAwaitingUserInputRef = useRef(false);
  const propBasedGameLoadRef = useRef(false);

  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [isEmergencyStopActive, setIsEmergencyStopActive] = useState(false);

  // --- Lyria State (Lifted from ControlsPanel) ---
  const [isLyriaModalOpen, setIsLyriaModalOpen] = useState(false); 
  const [isLyriaSaveLoadModalOpen, setIsLyriaSaveLoadModalOpen] = useState(false);
  
  const [lyriaPrompts, setLyriaPrompts] = useState<LyriaPrompt[]>(() => {
    return INITIAL_LYRIA_PROMPTS.map((p, index) => ({
      ...p,
      promptId: `lyria-prompt-default-${Date.now() + index}`,
      color: LYRIA_PROMPT_COLORS[index % LYRIA_PROMPT_COLORS.length]
    }));
  });
  const [lyriaConfig, setLyriaConfig] = useState<LiveMusicGenerationConfig>(INITIAL_LYRIA_CONFIG);

  const [lyriaPlaybackState, setLyriaPlaybackState] = useState<LyriaPlaybackState>('stopped');
  const lyriaSessionRef = useRef<LiveMusicSession | null>(null);
  const lyriaSessionErrorRef = useRef<boolean>(false);
  const lyriaAudioContextRef = useRef<AudioContext | null>(null);
  const lyriaOutputNodeRef = useRef<GainNode | null>(null);
  const lyriaNextChunkStartTimeRef = useRef<number>(0);
  const [lyriaStatusMessage, setLyriaStatusMessage] = useState<string>("Ready.");
  const presetPromptAddedRef = useRef(false);
  const lyriaBufferTime = 2; // seconds

  // --- End Lyria State ---


  useEffect(() => {
    const storedKey = localStorage.getItem(CUSTOM_API_KEY_STORAGE_KEY);
    if (storedKey) {
      setUserDefinedApiKey(storedKey);
      setActiveApiKeySource('custom');
    } else if (process.env.API_KEY) {
      setActiveApiKeySource('environment');
    } else {
      setActiveApiKeySource('missing');
    }
  }, []);


  const addMessageToHistory = useCallback((sender: SenderName | string, text: string | undefined, colorClassOverride?: string, isUserForNextAI: boolean = false, makeActiveTyping: boolean = true): string => {
    const newText = typeof text === 'string' ? text : "";

    let colorClass = colorClassOverride;
    if (!colorClass) {
        const ai1PersonaFromConstants = getAIPersona(1, currentMode, globalSelectedModelId);
        const ai2PersonaFromConstants = getAIPersona(2, currentMode, globalSelectedModelId);
        const storyWeaverPersonaConst = getAIPersona('STORY_WEAVER_SINGLE', AppMode.STORY_WEAVER_EXE, globalSelectedModelId);
        const chimeraDmPersonaConst = getAIPersona('CHIMERA_DM', AppMode.CHIMERA_EXE, globalSelectedModelId, 'gemini-2.0-flash');
        const chimeraPlayerPersonaConst = getAIPersona('CHIMERA_PLAYER_AI', AppMode.CHIMERA_EXE, globalSelectedModelId);


        if (sender === AI1_NAME && currentMode !== AppMode.CHIMERA_EXE) colorClass = ai1PersonaFromConstants?.color;
        else if (sender === AI2_NAME && currentMode !== AppMode.CHIMERA_EXE) colorClass = ai2PersonaFromConstants?.color;
        else if (sender === STORY_WEAVER_SENDER_NAME) colorClass = storyWeaverPersonaConst?.color;
        else if (sender === CHIMERA_DM_SENDER_NAME) colorClass = chimeraDmPersonaConst?.color;
        else if (sender === CHIMERA_PLAYER_SENDER_NAME) colorClass = chimeraPlayerPersonaConst?.color;
        else if (sender === USER_INTERVENTION_SENDER_NAME) colorClass = 'text-[var(--color-user-intervention)]';
        else if (sender === FACILITATOR_SENDER_NAME) colorClass = 'text-[var(--color-facilitator)]';
        else if (sender === SYSTEM_SENDER_NAME) colorClass = 'text-[var(--color-system-message)]';
    }

    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      sender,
      text: newText,
      timestamp: new Date().toISOString(),
      color: colorClass,
      isUser: isUserForNextAI
    };
    setConversationHistory(prev => [...prev, newMessage]);

    let doSetTypingId = false;
    const isNonSystemSender = sender !== SYSTEM_SENDER_NAME && sender !== FACILITATOR_SENDER_NAME && sender !== USER_INTERVENTION_SENDER_NAME;

    if (currentMode === AppMode.CHESS_SIM_EXE || currentMode === AppMode.NOOSPHERIC_CONQUEST_EXE) {
        doSetTypingId = false;
    } else if (currentMode === AppMode.CHIMERA_EXE) {
        if (makeActiveTyping && (sender === CHIMERA_DM_SENDER_NAME || sender === CHIMERA_PLAYER_SENDER_NAME)) {
            doSetTypingId = true;
        }
    } else if (currentMode === AppMode.STORY_WEAVER_EXE) {
        if (makeActiveTyping && sender === STORY_WEAVER_SENDER_NAME) {
            doSetTypingId = true;
        }
    } else { 
        if (makeActiveTyping && isNonSystemSender) {
            doSetTypingId = true;
        }
    }

    if (doSetTypingId) {
        setCurrentTypingMessageId(newMessage.id);
    }
    
    return newMessage.id;
  }, [currentMode, globalSelectedModelId]);

  // --- Lyria Functions (Moved from ControlsPanel) ---
  const connectToLyriaSession = useCallback(async () => {
    if (!lyriaAiInstanceRef.current) {
        setLyriaStatusMessage("Error: Lyria AI not initialized (check API key).");
        setLyriaPlaybackState('error');
        lyriaSessionErrorRef.current = true;
        return;
    }
    
    setLyriaStatusMessage("Connecting to Lyria session...");
    lyriaSessionErrorRef.current = false;

    if (!lyriaAudioContextRef.current) {
      lyriaAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 48000 });
    }
    if (lyriaAudioContextRef.current.state === 'suspended') {
      await lyriaAudioContextRef.current.resume();
    }
    if (!lyriaOutputNodeRef.current && lyriaAudioContextRef.current) {
        lyriaOutputNodeRef.current = lyriaAudioContextRef.current.createGain();
        lyriaOutputNodeRef.current.connect(lyriaAudioContextRef.current.destination);
    }

    try {
      lyriaSessionRef.current = await lyriaAiInstanceRef.current.live.music.connect({
        model: LYRIA_MODEL_NAME,
        callbacks: {
          onmessage: async (e: LiveMusicServerMessage) => {
            if (e.setupComplete) {
                setLyriaStatusMessage("Lyria session connected.");
                if (lyriaSessionRef.current && !lyriaSessionErrorRef.current) {
                    try {
                        await lyriaSessionRef.current.setMusicGenerationConfig({ musicGenerationConfig: lyriaConfig });
                        if (lyriaPrompts.length > 0) {
                            throttledSetLyriaPrompts();
                        }
                    } catch (configError: any) {
                        setLyriaStatusMessage(`Error setting initial config: ${configError.message || "Unknown"}`);
                        lyriaSessionErrorRef.current = true;
                        setLyriaPlaybackState('error');
                    }
                }
            }
            if (e.serverContent?.audioChunks?.[0]?.data) {
              setLyriaPlaybackState(currentLocalPlaybackState => {
                if (currentLocalPlaybackState === 'paused' || currentLocalPlaybackState === 'stopped' || lyriaSessionErrorRef.current) {
                  return currentLocalPlaybackState;
                }
                if (!lyriaAudioContextRef.current || !lyriaOutputNodeRef.current) {
                  lyriaSessionErrorRef.current = true; 
                  return 'error';
                }
                const audioData = decodeBase64(e.serverContent!.audioChunks![0].data);
                decodeLyriaAudioData(audioData, lyriaAudioContextRef.current!).then(audioBuffer => {
                  const source = lyriaAudioContextRef.current!.createBufferSource();
                  source.buffer = audioBuffer;
                  source.connect(lyriaOutputNodeRef.current!);
                  const currentTime = lyriaAudioContextRef.current!.currentTime;
                  let nextStartTime = lyriaNextChunkStartTimeRef.current;
                   if (nextStartTime === 0 && (currentLocalPlaybackState === 'loading' || currentLocalPlaybackState === 'playing') && !lyriaSessionErrorRef.current ) { 
                     nextStartTime = currentTime + lyriaBufferTime;
                  }
                  if (nextStartTime < currentTime) {
                    setLyriaStatusMessage("Audio buffer underrun, reloading...");
                    lyriaNextChunkStartTimeRef.current = currentTime; 
                    nextStartTime = currentTime;
                  }
                  source.start(nextStartTime);
                  lyriaNextChunkStartTimeRef.current = nextStartTime + audioBuffer.duration;
                }).catch(decodeError => {
                    setLyriaStatusMessage("Error: Could not decode audio.");
                    lyriaSessionErrorRef.current = true;
                    setLyriaPlaybackState('error'); 
                });
                if (currentLocalPlaybackState === 'loading' && !lyriaSessionErrorRef.current) {
                   setLyriaStatusMessage("Music playing.");
                   return 'playing';
                }
                return currentLocalPlaybackState;
              });
            } else if ((e as any).error) {
                setLyriaStatusMessage(`Lyria Error: ${(e as any).error.message || 'Unknown server error'}`);
                setLyriaPlaybackState('error');
                lyriaSessionErrorRef.current = true;
            }
          },
          onerror: (errEvent: Event) => {
            setLyriaStatusMessage(`Lyria connection error: ${(errEvent as any).message || 'Unknown. Check console.'}`);
            setLyriaPlaybackState('error');
            lyriaSessionRef.current = null;
            lyriaSessionErrorRef.current = true;
          },
          onclose: (closeEvent: CloseEvent) => {
            setLyriaPlaybackState(prevStateAtClose => {
                setLyriaStatusMessage("Lyria connection closed.");
                const newState = prevStateAtClose === 'error' ? 'error' : 'stopped';
                if (newState === 'stopped') lyriaNextChunkStartTimeRef.current = 0; 
                lyriaSessionRef.current = null;
                lyriaSessionErrorRef.current = true; 
                return newState;
            });
          },
        },
      });
    } catch (error: any) {
      setLyriaStatusMessage(`Failed to connect: ${error.message || "Unknown error"}`);
      setLyriaPlaybackState('error');
      lyriaSessionErrorRef.current = true;
    }
  }, [lyriaConfig, lyriaPrompts]); // Removed throttledSetLyriaPrompts, it will be called via useEffect on lyriaPrompts

  const throttledSetLyriaPrompts = useCallback(
    throttle(async () => {
      if (lyriaSessionRef.current && !lyriaSessionErrorRef.current && lyriaPlaybackState !== 'error') {
        const promptsToSend = lyriaPrompts.filter(p => p.text.trim() && p.weight > 0);
        const wasPlaying = lyriaPlaybackState === 'playing' || lyriaPlaybackState === 'loading';
        if (wasPlaying) {
          lyriaSessionRef.current?.pause();
          setLyriaStatusMessage("Applying prompt changes...");
          await new Promise(resolve => setTimeout(resolve, 50)); 
        }
        try {
          await lyriaSessionRef.current.setWeightedPrompts({ weightedPrompts: promptsToSend });
          setLyriaStatusMessage("Prompts updated.");
          if (wasPlaying && lyriaSessionRef.current && !lyriaSessionErrorRef.current) {
            lyriaSessionRef.current?.play();
            setLyriaStatusMessage("Music playing with new prompts.");
          }
        } catch (e: any) {
          setLyriaStatusMessage(`Error updating prompts: ${e.message || "Unknown"}`);
          lyriaSessionErrorRef.current = true;
          setLyriaPlaybackState('error');
        }
      }
    }, 300),
    [lyriaPrompts, lyriaPlaybackState] 
  );

  const throttledSetLyriaConfig = useCallback(
    throttle(async () => {
        if (lyriaSessionRef.current && !lyriaSessionErrorRef.current && lyriaPlaybackState !== 'error') {
            const wasPlaying = lyriaPlaybackState === 'playing' || lyriaPlaybackState === 'loading';
            if (wasPlaying) {
                lyriaSessionRef.current?.pause();
                setLyriaStatusMessage("Applying config changes...");
                await new Promise(resolve => setTimeout(resolve, 50));
            }
            try {
                await lyriaSessionRef.current.setMusicGenerationConfig({ musicGenerationConfig: lyriaConfig });
                setLyriaStatusMessage("Music config updated.");
                 if (wasPlaying && lyriaSessionRef.current && !lyriaSessionErrorRef.current) {
                    lyriaSessionRef.current?.play();
                    setLyriaStatusMessage("Music playing with new config.");
                }
            } catch (e: any) {
                setLyriaStatusMessage(`Error updating config: ${e.message || "Unknown"}`);
                lyriaSessionErrorRef.current = true;
                setLyriaPlaybackState('error');
            }
        }
    }, 300),
    [lyriaConfig, lyriaPlaybackState]
  );
  
  useEffect(() => {
    if (lyriaSessionRef.current && !lyriaSessionErrorRef.current && lyriaPlaybackState !== 'error') {
      throttledSetLyriaPrompts();
    }
  }, [lyriaPrompts, throttledSetLyriaPrompts, lyriaPlaybackState]); // Added lyriaPlaybackState dependency

  useEffect(() => {
    if (lyriaSessionRef.current && !lyriaSessionErrorRef.current && lyriaPlaybackState !== 'error') {
        throttledSetLyriaConfig();
    }
  }, [lyriaConfig, throttledSetLyriaConfig, lyriaPlaybackState]); // Added lyriaPlaybackState dependency

  const handleLyriaPlayPause = useCallback(async () => {
    if (isEmergencyStopActive) {
      setLyriaStatusMessage("Lyria is disabled due to Emergency Stop.");
      return;
    }
    if (!lyriaAiInstanceRef.current) {
        setLyriaStatusMessage("Error: Lyria AI not initialized.");
        return;
    }
    if (lyriaPlaybackState === 'playing' || lyriaPlaybackState === 'loading') {
      lyriaSessionRef.current?.pause();
      setLyriaPlaybackState('paused');
      setLyriaStatusMessage("Music paused.");
      if (lyriaOutputNodeRef.current && lyriaAudioContextRef.current) {
          lyriaOutputNodeRef.current.gain.linearRampToValueAtTime(0, lyriaAudioContextRef.current.currentTime + 0.1);
      }
      lyriaNextChunkStartTimeRef.current = 0;
    } else { 
      setLyriaPlaybackState('loading');
      setLyriaStatusMessage("Attempting to play/resume music...");
      if (!lyriaSessionRef.current || lyriaSessionErrorRef.current) {
        await connectToLyriaSession(); 
         if (lyriaSessionRef.current && !lyriaSessionErrorRef.current) {
            lyriaSessionRef.current.play();
             if (lyriaAudioContextRef.current && lyriaAudioContextRef.current.state === 'suspended') {
              await lyriaAudioContextRef.current.resume();
            }
            if (lyriaOutputNodeRef.current && lyriaAudioContextRef.current) {
                lyriaOutputNodeRef.current.gain.linearRampToValueAtTime(1, lyriaAudioContextRef.current.currentTime + 0.1);
            }
         } else if (!lyriaSessionRef.current || lyriaSessionErrorRef.current) {
            setLyriaPlaybackState('error'); // connectToLyriaSession will set error message
         }
      } else if (lyriaSessionRef.current && !lyriaSessionErrorRef.current) {
        lyriaSessionRef.current.play(); 
        if (lyriaAudioContextRef.current && lyriaAudioContextRef.current.state === 'suspended') {
          await lyriaAudioContextRef.current.resume();
        }
        if (lyriaOutputNodeRef.current && lyriaAudioContextRef.current) {
            lyriaOutputNodeRef.current.gain.linearRampToValueAtTime(1, lyriaAudioContextRef.current.currentTime + 0.1);
        }
      }
    }
  }, [lyriaPlaybackState, connectToLyriaSession, isEmergencyStopActive]);

  const handleLyriaResetContext = async () => {
    if (!lyriaSessionRef.current) {
        setLyriaStatusMessage("No active Lyria session to reset.");
        return;
    }
    const wasPlayingOrLoading = lyriaPlaybackState === 'playing' || lyriaPlaybackState === 'loading';
    lyriaSessionRef.current?.pause();
    setLyriaPlaybackState('paused'); 
    setLyriaStatusMessage("Resetting Lyria context...");
    lyriaNextChunkStartTimeRef.current = 0; 
    lyriaSessionRef.current?.resetContext();
    const defaultConfig = { temperature: 1.1, topK: 40, guidance: 4.0 };
    setLyriaConfig(defaultConfig);
    if (lyriaSessionRef.current && !lyriaSessionErrorRef.current) {
      try {
        await lyriaSessionRef.current.setMusicGenerationConfig({ musicGenerationConfig: defaultConfig });
      } catch (e) { console.error("[Lyria] Error applying default config during reset:", e); }
    }
    if (lyriaPrompts.length > 0 && lyriaSessionRef.current && !lyriaSessionErrorRef.current) {
      const promptsToSend = lyriaPrompts.filter(p => p.text.trim() && p.weight > 0);
      try {
        await lyriaSessionRef.current.setWeightedPrompts({ weightedPrompts: promptsToSend });
      } catch (e) { console.error("[Lyria] Error re-applying prompts after reset:", e); }
    }
    setLyriaStatusMessage("Lyria context reset.");
    if (wasPlayingOrLoading && lyriaSessionRef.current && !lyriaSessionErrorRef.current && !isEmergencyStopActive) {
        setLyriaPlaybackState('loading');
        lyriaSessionRef.current.play(); 
        if (lyriaAudioContextRef.current && lyriaAudioContextRef.current.state === 'suspended') {
            lyriaAudioContextRef.current.resume();
        }
        if (lyriaOutputNodeRef.current && lyriaAudioContextRef.current) {
            lyriaOutputNodeRef.current.gain.linearRampToValueAtTime(1, lyriaAudioContextRef.current.currentTime + 0.1);
        }
    } else if (wasPlayingOrLoading && (!lyriaSessionRef.current || lyriaSessionErrorRef.current || isEmergencyStopActive)) {
        setLyriaPlaybackState('stopped');
    }
  };

  const handleAddLyriaPrompt = () => {
    if (lyriaPrompts.length < MAX_LYRIA_PROMPTS) {
      const newPromptId = `lyria-prompt-${Date.now()}`;
      const usedColors = lyriaPrompts.map(p => p.color);
      const availableColors = LYRIA_PROMPT_COLORS.filter(c => !usedColors.includes(c));
      const newColor = availableColors.length > 0 ? availableColors[0] : LYRIA_PROMPT_COLORS[lyriaPrompts.length % LYRIA_PROMPT_COLORS.length];
      setLyriaPrompts([...lyriaPrompts, { promptId: newPromptId, text: "", weight: 1.0, color: newColor }]);
    } else {
      setLyriaStatusMessage(`Max ${MAX_LYRIA_PROMPTS} prompts reached.`);
    }
  };

  const handleRemoveLyriaPrompt = (id: string) => setLyriaPrompts(lyriaPrompts.filter(p => p.promptId !== id));
  const handleLyriaPromptTextChange = (id: string, text: string) => setLyriaPrompts(lyriaPrompts.map(p => p.promptId === id ? { ...p, text } : p));
  const handleLyriaPromptWeightChange = (id: string, weight: number) => setLyriaPrompts(lyriaPrompts.map(p => p.promptId === id ? { ...p, weight } : p));
  const handleLyriaConfigChange = (key: keyof LiveMusicGenerationConfig, value: any) => {
    let processedValue = value;
    if (key === 'temperature' || key === 'guidance') processedValue = parseFloat(value);
    else if (key === 'topK' || key === 'seed' || key === 'bpm') processedValue = value === '' || value === null ? undefined : parseInt(value, 10);
    if (isNaN(processedValue as number) && (key === 'topK' || key === 'seed' || key === 'bpm')) processedValue = undefined;
    setLyriaConfig(prev => ({ ...prev, [key]: processedValue }));
  };
  
  const handleSaveLyriaSettings = () => {
    const backupData: LyriaSessionBackup = { version: "1.0.0", timestamp: new Date().toISOString(), prompts: lyriaPrompts, config: lyriaConfig };
    const jsonData = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.download = `lyria_settings_${new Date().toISOString().replace(/:/g, '-')}.json`;
    a.href = url;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setLyriaStatusMessage("Lyria settings saved.");
  };

  const handleLoadLyriaSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const result = e.target?.result as string;
          const backupData = JSON.parse(result) as LyriaSessionBackup;
          if (backupData.prompts && Array.isArray(backupData.prompts) && backupData.config && typeof backupData.config === 'object') {
            setLyriaPrompts(backupData.prompts.slice(0, MAX_LYRIA_PROMPTS));
            setLyriaConfig(backupData.config);
            setLyriaStatusMessage("Lyria settings loaded. Applying...");
            // Effects will trigger throttled updates
          } else { throw new Error("Invalid Lyria settings file format."); }
        } catch (error: any) { setLyriaStatusMessage(`Error loading settings: ${error.message || 'Unknown'}`); }
      };
      reader.readAsText(file);
      event.target.value = ''; 
    }
  };
  // --- End Lyria Functions ---

  useEffect(() => { // Lyria AI Instance Initialization
    let keyToUse: string | undefined = undefined;
    if (activeApiKeySource === 'custom' && userDefinedApiKey) keyToUse = userDefinedApiKey;
    else if (activeApiKeySource === 'environment' && process.env.API_KEY) keyToUse = process.env.API_KEY;
    
    if (keyToUse && !apiKeyMissingError) {
        if (!lyriaAiInstanceRef.current) { 
            try {
                lyriaAiInstanceRef.current = new GoogleGenAI({ apiKey: keyToUse, apiVersion: 'v1alpha' });
                setLyriaStatusMessage("Lyria AI Ready.");
            } catch (e) {
                console.error("[Lyria] Failed to initialize GoogleGenAI for Lyria:", e);
                setLyriaStatusMessage("Error: Failed to init Lyria AI.");
                lyriaAiInstanceRef.current = null;
            }
        }
    } else {
        lyriaAiInstanceRef.current = null;
        if (isLyriaModalOpen) setLyriaStatusMessage("Error: Lyria requires an active API key.");
    }
  }, [activeApiKeySource, userDefinedApiKey, apiKeyMissingError, isLyriaModalOpen]);

  useEffect(() => { // Lyria default prompt
    if (isLyriaModalOpen && !presetPromptAddedRef.current && lyriaPrompts.length === 0 && lyriaAiInstanceRef.current) {
      const defaultPromptId = `lyria-prompt-default-${Date.now()}`;
      setLyriaPrompts([{ promptId: defaultPromptId, text: "post-rock full band", weight: 1.0, color: LYRIA_PROMPT_COLORS[0] || "#9900ff" }]);
      presetPromptAddedRef.current = true;
    }
    if (!isLyriaModalOpen) presetPromptAddedRef.current = false; 
  }, [isLyriaModalOpen, lyriaPrompts]);

  const initializeAI = useCallback(async (
    mode: AppMode,
    fromBackup: boolean = false,
    historyToRestore: Content[] = [],
    ai1HistoryToRestore?: Content[],
    ai2HistoryToRestore?: Content[]
  ): Promise<boolean> => {
    setIsLoading(true);
    setInitializationError(null);
    setApiKeyMissingError(false);
    setIsAiReadyForChess(false);
    setIsAiReadyForNoospheric(false);
    setIsAiReadyForChimera(false);

    let keyToUse: string | undefined = undefined;
    if (userDefinedApiKey) {
        keyToUse = userDefinedApiKey;
        setActiveApiKeySource('custom');
    } else if (process.env.API_KEY) {
        keyToUse = process.env.API_KEY;
        setActiveApiKeySource('environment');
    } else {
        setApiKeyMissingError(true);
        setInitializationError("API Key is missing. Please set the API_KEY environment variable or provide a custom key.");
        setActiveApiKeySource('missing');
        setIsLoading(false);
        return false;
    }
    
    try {
      genAI.current = new GoogleGenAI({ apiKey: keyToUse });
      genAIInstanceInitialized.current = true;
    } catch (e: any) {
      console.error("Failed to initialize GoogleGenAI:", e);
      setInitializationError(`Failed to initialize GoogleGenAI: ${e.message}`);
      setApiKeyMissingError(true); 
      setActiveApiKeySource('missing');
      setIsLoading(false);
      return false;
    }

    ai1ChatRef.current = null;
    ai2ChatRef.current = null;
    storyWeaverChatRef.current = null;
    storyOptionGeneratorChatRef.current = null;
    chimeraDmAiChatRef.current = null;
    chimeraPlayerAiChatRef.current = null;

    let ai1Persona: AIPersona | null = null;
    let ai2Persona: AIPersona | null = null;

    try {
      if (mode === AppMode.STORY_WEAVER_EXE) {
        const swPersona = getAIPersona('STORY_WEAVER_SINGLE', mode, globalSelectedModelId);
        if (swPersona) {
          storyWeaverChatRef.current = genAI.current.chats.create({
            model: swPersona.modelName,
            config: { systemInstruction: swPersona.systemPrompt },
            history: historyToRestore, 
          });
          storyOptionGeneratorChatRef.current = genAI.current.chats.create({
            model: GEMINI_MODEL_NAME_FLASH_DEFAULT, 
            config: { systemInstruction: STORY_OPTION_GENERATOR_SYSTEM_PROMPT, responseMimeType: "application/json" },
          });

        } else {
          throw new Error("Story Weaver persona not found.");
        }
      } else if (mode === AppMode.CHIMERA_EXE) {
        const dmPersona = getAIPersona('CHIMERA_DM', mode, globalSelectedModelId, 'gemini-2.0-flash'); 
        const playerPersona = getAIPersona('CHIMERA_PLAYER_AI', mode, globalSelectedModelId);
        if (dmPersona && playerPersona) {
          chimeraDmAiChatRef.current = genAI.current.chats.create({
            model: dmPersona.modelName,
            config: { systemInstruction: dmPersona.systemPrompt },
            history: ai1HistoryToRestore || [],
          });
          chimeraPlayerAiChatRef.current = genAI.current.chats.create({
            model: playerPersona.modelName,
            config: { systemInstruction: playerPersona.systemPrompt },
            history: ai2HistoryToRestore || [],
          });
          setIsAiReadyForChimera(true);
        } else {
          throw new Error("Chimera DM or Player persona not found.");
        }
      } else {
        ai1Persona = getAIPersona(1, mode, globalSelectedModelId);
        ai2Persona = getAIPersona(2, mode, globalSelectedModelId);

        if (ai1Persona) {
          ai1ChatRef.current = genAI.current.chats.create({
            model: ai1Persona.modelName,
            config: { systemInstruction: ai1Persona.systemPrompt },
            history: ai1HistoryToRestore || historyToRestore,
          });
        }
        if (ai2Persona) {
          ai2ChatRef.current = genAI.current.chats.create({
            model: ai2Persona.modelName,
            config: { systemInstruction: ai2Persona.systemPrompt },
            history: ai2HistoryToRestore || historyToRestore,
          });
        }

        if (mode === AppMode.CHESS_SIM_EXE && ai1ChatRef.current && ai2ChatRef.current) {
          setIsAiReadyForChess(true);
        }
        if (mode === AppMode.NOOSPHERIC_CONQUEST_EXE && ai1ChatRef.current && ai2ChatRef.current) {
          setIsAiReadyForNoospheric(true);
        }
      }
      setApiKeyMissingError(false);
      setIsLoading(false);
      return true;
    } catch (e: any) {
      console.error("Error initializing AI chats:", e);
      setInitializationError(`Error initializing AI for ${mode}: ${e.message}`);
      setIsLoading(false);
      return false;
    }
  }, [globalSelectedModelId, userDefinedApiKey]);

 const generateAndAddImageSnapshot = useCallback(async (prompt: string, messageIdToUpdate?: string) => {
    if (!genAI.current || isEmergencyStopActive) {
        addMessageToHistory(SYSTEM_SENDER_NAME, "Image generation skipped (AI stopped or not initialized).", 'text-[var(--color-error)]', false, false);
        return;
    }
    setIsGeneratingImage(true);
    let tempImageMsgId: string | undefined;
    if (!messageIdToUpdate && currentMode === AppMode.STORY_WEAVER_EXE) {
        tempImageMsgId = addMessageToHistory(SYSTEM_SENDER_NAME, `System: Generating image (Model: ${IMAGEN_MODEL_NAME}): "${prompt.substring(0, 50)}..."`, 'text-[var(--color-system-message)]', false, false);
    } else if (messageIdToUpdate) {
        // Keep existing logic for other modes if needed
    }

    let capturedErrorForFinally: any = null;

    try {
        const response = await genAI.current.models.generateImages({
            model: IMAGEN_MODEL_NAME,
            prompt: prompt,
            config: { numberOfImages: 1, outputMimeType: 'image/jpeg' }
        });

        if (isEmergencyStopActive) { setIsGeneratingImage(false); return; }

        if (response.generatedImages && response.generatedImages.length > 0 && response.generatedImages[0].image.imageBytes) {
            const base64Data = response.generatedImages[0].image.imageBytes;
            const newSnapshot: ImageSnapshot = {
                id: `snap-${Date.now()}`,
                url: `data:image/jpeg;base64,${base64Data}`,
                prompt: prompt,
                timestamp: Date.now(),
            };
            setImageSnapshots(prev => [...prev, newSnapshot].slice(-20));
            if (currentMode === AppMode.STORY_WEAVER_EXE) {
                setLastGeneratedImageForStoryWeaver({ mimeType: 'image/jpeg', data: base64Data });
            }
            if (tempImageMsgId) {
                setConversationHistory(prev => prev.filter(m => m.id !== tempImageMsgId));
            }
        } else {
            throw new Error("No image data received from API.");
        }
    } catch (error: any) {
        capturedErrorForFinally = error;
        console.error(`Error generating image with ${IMAGEN_MODEL_NAME}:`, error);
        const errorText = `System: Image generation failed (${IMAGEN_MODEL_NAME}) for prompt: "${prompt.substring(0, 50)}...". ${error instanceof Error ? error.message : "Unknown error"}`;
        if (tempImageMsgId) {
            setConversationHistory(prev => prev.map(m => m.id === tempImageMsgId ? { ...m, text: errorText, color: 'text-[var(--color-error)]' } : m));
        } else if (messageIdToUpdate) {
            // For other modes, this logic would need to be reviewed if messageIdToUpdate is used.
             addMessageToHistory(SYSTEM_SENDER_NAME, errorText, 'text-[var(--color-error)]', false, false);
        } else {
            addMessageToHistory(SYSTEM_SENDER_NAME, errorText, 'text-[var(--color-error)]', false, false);
        }
    } finally {
       setIsGeneratingImage(false);
    }
  }, [addMessageToHistory, isEmergencyStopActive, currentMode]);


  const generateContinuationOptions = useCallback(async (currentStoryContext: string, initialSeed: StorySeed) => {
    if (!storyOptionGeneratorChatRef.current || isEmergencyStopActive) {
        addMessageToHistory(SYSTEM_SENDER_NAME, "Story option generator not ready or AI stopped.", 'text-[var(--color-error)]', false, false);
        setStoryContinuationOptions([
            { id: 'default1_err', text: 'Explore further.' },
            { id: 'default2_err', text: 'Check inventory.' },
            { id: 'default3_err', text: 'Wait and observe.' },
        ]);
        setIsAwaitingStoryContinuationChoice(true); 
        return;
    }
    setIsLoading(true);
    setActiveAINameForLoading("Option Generator");
    setStoryContinuationOptions([]);

    const optionPrompt = `Initial Seed: ${JSON.stringify({title: initialSeed.title, genre: STORY_GENRES.find(g => initialSeed.prompt.includes(g)), characters: STORY_CHARACTERS.find(c => initialSeed.prompt.includes(c)), setting: STORY_SETTINGS.find(s => initialSeed.prompt.includes(s)), conflict: STORY_CONFLICTS_OR_ITEMS.find(item => initialSeed.prompt.includes(item)), keyword: STORY_KEYWORDS.find(k => initialSeed.prompt.includes(k))})}\nCurrent Story: "${currentStoryContext.slice(-1000)}" \nGenerate 3 distinct, engaging, concise (1-2 sentences each) continuation options.`;
    
    try {
        const response = await storyOptionGeneratorChatRef.current.sendMessage({ message: [{ text: optionPrompt }] });
        if (isEmergencyStopActive) { setIsLoading(false); setActiveAINameForLoading(null); return; }

        let jsonStr = response.text.trim();
        const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
        const match = jsonStr.match(fenceRegex);
        if (match && match[2]) {
            jsonStr = match[2].trim();
        }
        const parsedOptions: StoryOption[] = JSON.parse(jsonStr);
        if (Array.isArray(parsedOptions) && parsedOptions.length === 3 && parsedOptions.every(opt => typeof opt.id === 'string' && typeof opt.text === 'string')) {
            setStoryContinuationOptions(parsedOptions);
        } else {
            throw new Error("Invalid options format received from AI.");
        }
    } catch (e: any) {
        console.error("Error generating story continuation options:", e);
        addMessageToHistory(SYSTEM_SENDER_NAME, `Error generating story options: ${e.message}. Defaulting to generic options.`, 'text-[var(--color-error)]', false, false);
        setStoryContinuationOptions([
            { id: 'default1', text: 'The character cautiously explores the surroundings.' },
            { id: 'default2', text: 'A sudden event changes everything.' },
            { id: 'default3', text: 'An old memory offers a clue.' },
        ]);
    } finally {
        setIsLoading(false);
        setActiveAINameForLoading(null);
        setIsAwaitingStoryContinuationChoice(true);
    }
  }, [isEmergencyStopActive, addMessageToHistory]);


  const evolveStoryImageAndContinue = useCallback(async (chosenContinuationText: string) => {
    if (!storyWeaverChatRef.current || isEmergencyStopActive) {
        addMessageToHistory(SYSTEM_SENDER_NAME, "Story Weaver AI not ready or stopped. Cannot evolve story.", 'text-[var(--color-error)]', false, false);
        const fullStoryContext = conversationHistory.map(m => m.text).join("\n") + "\n" + chosenContinuationText;
        if (selectedStorySeed) generateContinuationOptions(fullStoryContext, selectedStorySeed);
        return;
    }
    setIsLoading(true);
    setActiveAINameForLoading(STORY_WEAVER_SENDER_NAME);
    
    const contentParts: Part[] = [{ text: chosenContinuationText }];
    
    const storyMsgId = addMessageToHistory(STORY_WEAVER_SENDER_NAME, "...", STORY_WEAVER_COLOR, false, true);

    try {
        const responseFromAI = await storyWeaverChatRef.current.sendMessage({ message: contentParts });
        if (isEmergencyStopActive) { setIsLoading(false); setActiveAINameForLoading(null); return; }
        
        const storySegmentFromAI = responseFromAI.text; 
        setConversationHistory(prev => prev.map(msg => msg.id === storyMsgId ? { ...msg, text: storySegmentFromAI } : msg));
        
        const imageMatch = storySegmentFromAI.match(IMAGE_GEN_COMMAND_REGEX);

        if (imageMatch && imageMatch[0]) {
            const firstFullCommand = imageMatch[0];
            const imagePromptMatch = firstFullCommand.match(/\[GENERATE_IMAGE:\s*([^\]]+)\]/i);
            
            if (imagePromptMatch && imagePromptMatch[1] && !processedImageCommandMessageIds.has(storyMsgId)) {
                const imagePrompt = imagePromptMatch[1].trim();
                const textWithoutCommand = storySegmentFromAI.replace(firstFullCommand, `(Visualizing: ${imagePrompt.substring(0,30)}...)`).trim();
                setConversationHistory(prev => prev.map(msg => msg.id === storyMsgId ? { ...msg, text: textWithoutCommand } : msg));
                
                await generateAndAddImageSnapshot(imagePrompt, undefined); 
                setProcessedImageCommandMessageIds(prev => new Set(prev).add(storyMsgId));
            }
        } else {
             addMessageToHistory(SYSTEM_SENDER_NAME, "AI did not provide an image command. Consider using 'Visualize Latest Scene'.", 'text-[var(--color-info)]', false, false);
        }
      
    } catch (e: any) {
        console.error(`Error with ${STORY_WEAVER_SENDER_NAME} during story evolution:`, e);
        setConversationHistory(prev => prev.map(msg => msg.id === storyMsgId ? { ...msg, text: `Error continuing story: ${e.message}`, color: 'text-[var(--color-error)]' } : msg));
    } finally {
        setIsLoading(false);
        setActiveAINameForLoading(null);
        setCurrentTypingMessageId(null); 
        
        const fullStoryContext = conversationHistory.map(m => m.text).join("\n") + "\n" + chosenContinuationText;
        if (selectedStorySeed) {
            generateContinuationOptions(fullStoryContext, selectedStorySeed);
        }
    }
  }, [
    isEmergencyStopActive, addMessageToHistory, conversationHistory, selectedStorySeed, 
    generateContinuationOptions, generateAndAddImageSnapshot, processedImageCommandMessageIds
  ]);


  const handleSelectStorySeed = useCallback(async (seed: StorySeed) => {
    setSelectedStorySeed(seed);
    setIsAwaitingSeedChoice(false);
    setConversationHistory([]);
    setImageSnapshots([]);
    setProcessedImageCommandMessageIds(new Set());
    setLastGeneratedImageForStoryWeaver(null);
    setStoryWeaverTurnCount(0);
    setStoryContinuationOptions([]);
    setIsAwaitingStoryContinuationChoice(false);

    if (!storyWeaverChatRef.current || isEmergencyStopActive) {
        addMessageToHistory(SYSTEM_SENDER_NAME, "Story Weaver AI not ready. Cannot start story.", 'text-[var(--color-error)]', false, false);
        return;
    }
    
    setIsLoading(true);
    setActiveAINameForLoading(STORY_WEAVER_SENDER_NAME);
    
    const initialStoryMsgId = addMessageToHistory(STORY_WEAVER_SENDER_NAME, `Starting story with seed: "${seed.title}"...`, STORY_WEAVER_COLOR, false, true);
    
    try {
        const response = await storyWeaverChatRef.current.sendMessage({ message: [{text: seed.prompt}] });
        if (isEmergencyStopActive) { setIsLoading(false); setActiveAINameForLoading(null); return; }

        let storySegment = response.text;
        const imageMatch = storySegment.match(IMAGE_GEN_COMMAND_REGEX);

        if (imageMatch && imageMatch[0]) {
            const firstFullCommand = imageMatch[0];
            const imagePromptMatch = firstFullCommand.match(/\[GENERATE_IMAGE:\s*([^\]]+)\]/i);
            if (imagePromptMatch && imagePromptMatch[1] && !processedImageCommandMessageIds.has(initialStoryMsgId)) {
                const imagePrompt = imagePromptMatch[1].trim();
                storySegment = storySegment.replace(firstFullCommand, `(Visualizing: ${imagePrompt.substring(0,30)}...)`).trim();
                await generateAndAddImageSnapshot(imagePrompt, undefined);
                setProcessedImageCommandMessageIds(prev => new Set(prev).add(initialStoryMsgId));
            }
        }
        setConversationHistory(prev => prev.map(msg => msg.id === initialStoryMsgId ? { ...msg, text: storySegment } : msg));
        setStoryWeaverTurnCount(prev => prev + 1);
        
        if (selectedStorySeed || seed) { 
           generateContinuationOptions(storySegment, selectedStorySeed || seed);
        }

    } catch (e: any) {
        console.error(`Error with ${STORY_WEAVER_SENDER_NAME} on initial seed:`, e);
        const errorText = `Error starting story: ${e.message || "Unknown error"}`;
        setConversationHistory(prev => prev.map(msg => msg.id === initialStoryMsgId ? { ...msg, text: errorText, color: 'text-[var(--color-error)]' } : msg));
    } finally {
        setCurrentTypingMessageId(null);
        setIsLoading(false);
        setActiveAINameForLoading(null);
    }
  }, [
    addMessageToHistory, isEmergencyStopActive, generateAndAddImageSnapshot, 
    processedImageCommandMessageIds, generateContinuationOptions, selectedStorySeed
  ]);

  const handleSelectStoryContinuation = useCallback((selectedOption: StoryOption) => {
    if (isEmergencyStopActive) return;
    addMessageToHistory(SYSTEM_SENDER_NAME, `Path chosen: "${selectedOption.text}"`, 'text-[var(--color-user-intervention)]', false, false);
    setIsAwaitingStoryContinuationChoice(false);
    setStoryWeaverTurnCount(prev => prev + 1);
    evolveStoryImageAndContinue(selectedOption.text);
  }, [isEmergencyStopActive, addMessageToHistory, evolveStoryImageAndContinue]);

  const handleRequestStoryWeaverImage = useCallback(async () => {
    if (isGeneratingImage || isLoading || isEmergencyStopActive || !genAI.current) {
      addMessageToHistory(SYSTEM_SENDER_NAME, "Cannot generate image now (busy, stopped, or AI not ready).", 'text-[var(--color-info)]', false, false);
      return;
    }

    let contextForImage = "A scene from the ongoing story."; // Default
    if (conversationHistory.length > 0) {
      const relevantMessages = conversationHistory
        .filter(msg => msg.sender === STORY_WEAVER_SENDER_NAME || (msg.sender === SYSTEM_SENDER_NAME && msg.text.startsWith("Path chosen:")))
        .slice(-3); 
      if (relevantMessages.length > 0) {
        contextForImage = relevantMessages.map(m => m.text.replace(/\(Visualizing:.*?\)/g, '').trim()).join(" ");
      }
    }
    
    if (!contextForImage.trim()) {
        addMessageToHistory(SYSTEM_SENDER_NAME, "Not enough story context to generate an image.", 'text-[var(--color-info)]', false, false);
        return;
    }

    const promptForAI = `Based on the story segment: "${contextForImage.substring(0, 200)}", generate a new, detailed image prompt.`;
    
    setIsLoading(true); 
    setActiveAINameForLoading("Image Prompt Helper");
    let imagePrompt = contextForImage.substring(0, 250); 

    try {
        const helperAI = genAI.current.chats.create({ model: GEMINI_MODEL_NAME_FLASH_DEFAULT });
        const response = await helperAI.sendMessage({message: promptForAI});
        if (response.text) {
            imagePrompt = response.text.trim();
        }
    } catch(e) {
        console.error("Error getting image prompt from helper AI:", e);
        addMessageToHistory(SYSTEM_SENDER_NAME, "Helper AI for image prompt failed. Using story context directly.", 'text-[var(--color-info)]', false, false);
    } finally {
        setIsLoading(false);
        setActiveAINameForLoading(null);
    }

    addMessageToHistory(SYSTEM_SENDER_NAME, `(User requested image visualization for: ${imagePrompt.substring(0, 50)}...)`, 'text-[var(--color-user-intervention)]', false, false);
    await generateAndAddImageSnapshot(imagePrompt);
  }, [conversationHistory, genAI, isEmergencyStopActive, isLoading, isGeneratingImage, addMessageToHistory, generateAndAddImageSnapshot]);


  const makeAiRespond = useCallback(async () => {
    if (isEmergencyStopActive || isLoading) return;
    if (currentMode === AppMode.STORY_WEAVER_EXE) {
        return;
    }

    let currentAI: Chat | null = null;
    let currentAIName: string = "";
    let promptText: string | undefined;
    let actualPromptSource: 'history' | 'intervention_chat' | 'intervention_ai1' | 'intervention_ai2' | 'initial_prompt' = 'history';

    if (isUserInterventionPendingRef.current && interventionTargetForPendingRef.current) {
        if (interventionTargetForPendingRef.current === 'AI1') {
            currentAI = ai1ChatRef.current;
            currentAIName = AI1_NAME;
            promptText = pendingInterventionTextRef.current || queuedInterventionForAI1Ref.current;
            actualPromptSource = 'intervention_ai1';
        } else if (interventionTargetForPendingRef.current === 'AI2') {
            currentAI = ai2ChatRef.current;
            currentAIName = AI2_NAME;
            promptText = pendingInterventionTextRef.current || queuedInterventionForAI2Ref.current;
            actualPromptSource = 'intervention_ai2';
        } else { 
            currentAI = nextAiToSpeakRef.current === 'AI1' ? ai1ChatRef.current : ai2ChatRef.current;
            currentAIName = nextAiToSpeakRef.current === 'AI1' ? AI1_NAME : AI2_NAME;
            const lastMessage = conversationHistory[conversationHistory.length - 1];
            if (lastMessage && lastMessage.sender === USER_INTERVENTION_SENDER_NAME && lastMessage.text === pendingInterventionTextRef.current) {
                promptText = lastMessage.text;
            } else {
                promptText = pendingInterventionTextRef.current || undefined; 
            }
            actualPromptSource = 'intervention_chat';
        }
    } else {
        currentAI = nextAiToSpeakRef.current === 'AI1' ? ai1ChatRef.current : ai2ChatRef.current;
        currentAIName = nextAiToSpeakRef.current === 'AI1' ? AI1_NAME : AI2_NAME;

        if (nextAiToSpeakRef.current === 'AI1' && queuedInterventionForAI1Ref.current) {
            promptText = queuedInterventionForAI1Ref.current;
            actualPromptSource = 'intervention_ai1'; 
        } else if (nextAiToSpeakRef.current === 'AI2' && queuedInterventionForAI2Ref.current) {
            promptText = queuedInterventionForAI2Ref.current;
            actualPromptSource = 'intervention_ai2';
        } else {
            const lastMessage = conversationHistory[conversationHistory.length - 1];
            if (lastMessage) {
                promptText = lastMessage.text;
            } else if (currentMode === AppMode.SEMANTIC_ESCAPE_EXE && nextAiToSpeakRef.current === 'AI1' && conversationHistory.length === 1 && conversationHistory[0].sender === FACILITATOR_SENDER_NAME) {
                promptText = conversationHistory[0].text; 
                actualPromptSource = 'initial_prompt';
            }
        }
    }

    if (!currentAI || !promptText || promptText.trim() === "") {
      setIsLoading(false);
      setActiveAINameForLoading(null);
      if(isUserInterventionPendingRef.current) { 
          isUserInterventionPendingRef.current = false;
          pendingInterventionTextRef.current = null;
          interventionTargetForPendingRef.current = null;
          queuedInterventionForAI1Ref.current = null;
          queuedInterventionForAI2Ref.current = null;
      }
      return;
    }

    setIsLoading(true);
    setActiveAINameForLoading(currentAIName);
    const persona = getAIPersona(currentAIName === AI1_NAME ? 1 : 2, currentMode, globalSelectedModelId);
    const typingMsgId = addMessageToHistory(currentAIName, "", persona?.color);

    try {
      const response: GenerateContentResponse = await currentAI.sendMessage({ message: [{ text: promptText }] });
      if (isEmergencyStopActive) { setIsLoading(false); return; }

      setConversationHistory(prev => prev.map(msg => msg.id === typingMsgId ? { ...msg, text: response.text } : msg));
    } catch (e: any) {
      console.error(`Error with ${currentAIName}:`, e);
      const errorText = `Error: ${currentAIName} failed to respond. ${e.message || "Ensure API key is valid and model is available."}`;
      setConversationHistory(prev => prev.map(msg => msg.id === typingMsgId ? { ...msg, text: errorText, color: 'text-[var(--color-error)]' } : msg));
      setIsAwaitingUserInput(true); 
    } finally {
      setIsLoading(false);
      setActiveAINameForLoading(null);
      setCurrentTypingMessageId(null); 

      if (actualPromptSource.startsWith('intervention')) {
          isUserInterventionPendingRef.current = false;
          pendingInterventionTextRef.current = null;
          interventionTargetForPendingRef.current = null;
          queuedInterventionForAI1Ref.current = null; 
          queuedInterventionForAI2Ref.current = null;
      }

      if (actualPromptSource === 'intervention_ai1') {
          nextAiToSpeakRef.current = 'AI2';
      } else if (actualPromptSource === 'intervention_ai2') {
          nextAiToSpeakRef.current = 'AI1';
      } else if (currentAIName === AI1_NAME) {
          nextAiToSpeakRef.current = 'AI2';
      } else if (currentAIName === AI2_NAME) {
          nextAiToSpeakRef.current = 'AI1';
      }

      if (currentMode !== AppMode.UNIVERSE_SIM_EXE) {
          const lastSpeakerWasAI2 = currentAIName === AI2_NAME;
          const lastSpeakerWasAI1InSemanticAfterAI2 = currentMode === AppMode.SEMANTIC_ESCAPE_EXE && currentAIName === AI1_NAME && conversationHistory.length > 1 && conversationHistory[conversationHistory.length - 2]?.sender === AI2_NAME;


          if (lastSpeakerWasAI2 || lastSpeakerWasAI1InSemanticAfterAI2) {
              if (actualPromptSource !== 'initial_prompt' || (currentMode === AppMode.SEMANTIC_ESCAPE_EXE && lastSpeakerWasAI1InSemanticAfterAI2) ) {
                   setTurnCycleCount(prev => prev + 1);
              }
          }
      }
      setForceTurnCheckToken(prev => prev + 1); 
    }
  }, [
    conversationHistory, currentMode, isLoading, addMessageToHistory, 
    globalSelectedModelId, isEmergencyStopActive, 
  ]);

  const generateStorySeeds = useCallback(() => {
    const seeds: StorySeed[] = [];
    const usedCombinations = new Set<string>();

    for (let i = 0; i < 3; i++) {
      let genre, character, setting, conflict, keyword, title, prompt;
      let combinationKey;
      do {
        genre = STORY_GENRES[Math.floor(Math.random() * STORY_GENRES.length)];
        character = STORY_CHARACTERS[Math.floor(Math.random() * STORY_CHARACTERS.length)];
        setting = STORY_SETTINGS[Math.floor(Math.random() * STORY_SETTINGS.length)];
        conflict = STORY_CONFLICTS_OR_ITEMS[Math.floor(Math.random() * STORY_CONFLICTS_OR_ITEMS.length)];
        keyword = STORY_KEYWORDS[Math.floor(Math.random() * STORY_KEYWORDS.length)];
        combinationKey = `${genre}-${character}-${setting}-${conflict}-${keyword}`;
      } while (usedCombinations.has(combinationKey));
      usedCombinations.add(combinationKey);
      
      const characterWords = character.split(" ");
      const lastWord = characterWords.pop();
      const characterNameForTitle = (typeof lastWord === 'string' && lastWord.trim() !== "") ? lastWord : "Protagonist";

      title = `${genre}: The ${keyword.charAt(0).toUpperCase() + keyword.slice(1)} of ${characterNameForTitle}`;
      const description = `A ${genre} tale featuring ${character} in ${setting}, centered around ${conflict} and influenced by the concept of "${keyword}".`;
      prompt = `Begin a ${genre} story. The protagonist is ${character}. The story unfolds in ${setting}. A central element is ${conflict}. The guiding keyword for the tone and events is "${keyword}". Weave these elements into an engaging opening. You MUST include a [GENERATE_IMAGE: your detailed image prompt] command for the initial scene.`;
      
      seeds.push({ id: `seed-${Date.now()}-${i}`, title, description, prompt });
    }
    setStorySeeds(seeds);
  }, []);


  const resetAndInitializeForNewMode = useCallback(async (mode: AppMode, fromBackup: boolean = false, backupData?: ConversationBackup) => {
    setConversationHistory([]);
    setTurnCycleCount(0);
    setStoryWeaverTurnCount(0); 
    setIsLoading(true);
    setActiveAINameForLoading(null);
    setCurrentTypingMessageId(null);
    setIsAwaitingUserInput(false);
    setUserInputText("");
    setUniverseSimInputText("");
    isUserInterventionPendingRef.current = false;
    pendingInterventionTextRef.current = null;
    queuedInterventionForAI1Ref.current = null;
    queuedInterventionForAI2Ref.current = null;
    setImageSnapshots(backupData?.imageSnapshots || []);
    setProcessedImageCommandMessageIds(new Set());
    setLastGeneratedImageForStoryWeaver(backupData?.lastGeneratedImageForStoryWeaver || null);
    setChessInitialFen(INITIAL_BOARD_FEN);
    setChessInitialPlayer(undefined);
    setChessInitialCoTAI1("");
    setChessInitialCoTAI2("");
    setChessInitialGameStatus(undefined);
    setNoosphericInitialState(undefined);
    setNoosphericInitialMapType(undefined);
    setNoosphericGameStartedFromBackup(false);
    setChimeraInitialGameState(undefined);
    chimeraResetTokenRef.current += 1;
    chessResetTokenRef.current += 1;
    noosphericResetTokenRef.current += 1;
    
    setIsAwaitingSeedChoice(mode === AppMode.STORY_WEAVER_EXE && !fromBackup);
    setSelectedStorySeed(fromBackup && mode === AppMode.STORY_WEAVER_EXE ? (backupData?.selectedStorySeed || null) : null);
    setStorySeeds([]);
    setStoryContinuationOptions(fromBackup && mode === AppMode.STORY_WEAVER_EXE ? (backupData?.storyContinuationOptions || []) : []);
    setIsAwaitingStoryContinuationChoice(fromBackup && mode === AppMode.STORY_WEAVER_EXE ? (backupData?.isAwaitingStoryContinuationChoice || false) : false);

    if (backupData?.lyriaPrompts) setLyriaPrompts(backupData.lyriaPrompts);
    if (backupData?.lyriaConfig) setLyriaConfig(backupData.lyriaConfig);


    const ai1History = backupData?.personas.ai1.initialInternalHistory || [];
    const ai2History = backupData?.personas.ai2?.initialInternalHistory || [];
    
    let storyWeaverHistory: Content[] = [];
    if (mode === AppMode.STORY_WEAVER_EXE && backupData?.conversationHistory) {
        storyWeaverHistory = backupData.conversationHistory
            .filter(m => m.sender === STORY_WEAVER_SENDER_NAME || (m.sender === SYSTEM_SENDER_NAME && m.text.startsWith("Path chosen:"))) 
            .map(m => ({ role: m.sender === STORY_WEAVER_SENDER_NAME ? 'model' : 'user', parts: [{text: m.text}] }));
    } else if (mode !== AppMode.STORY_WEAVER_EXE && backupData?.conversationHistory) {
        storyWeaverHistory = backupData.conversationHistory.map(m => ({ role: m.isUser ? 'user' : 'model', parts: [{text: m.text}] }));
    }


    const aiInitialized = await initializeAI(
        mode, 
        fromBackup, 
        storyWeaverHistory, 
        ai1History, 
        ai2History
    );

    if (!aiInitialized) {
      return;
    }

    if (mode === AppMode.STORY_WEAVER_EXE && !fromBackup) {
        generateStorySeeds();
        // isAwaitingSeedChoice is already set true above for this case
         addMessageToHistory(SYSTEM_SENDER_NAME, STORY_WEAVER_EXE_START_MESSAGES[0].text, undefined, false, false);
    }

    if (backupData) {
      setConversationHistory(backupData.conversationHistory);
      setTurnCycleCount(backupData.turnCycleCount);
      setStoryWeaverTurnCount(backupData.storyWeaverTurnCount || 0);
      nextAiToSpeakRef.current = backupData.nextAiToSpeak || (mode === AppMode.STORY_WEAVER_EXE ? 'STORY_WEAVER' : 'AI1');
      if (backupData.themeName) setActiveTheme(backupData.themeName);
      if (backupData.typingSpeedMs) setTypingSpeedMs(backupData.typingSpeedMs);
      if (backupData.matrixSettings) setMatrixSettings(prev => ({...prev, ...backupData.matrixSettings}));
      
      if (mode === AppMode.STORY_WEAVER_EXE) {
        // Ensure that if we are loading a backup, seed choice is bypassed
        setIsAwaitingSeedChoice(false); 
        setSelectedStorySeed(backupData.selectedStorySeed || null);
        setStoryContinuationOptions(backupData.storyContinuationOptions || []);
        setIsAwaitingStoryContinuationChoice(backupData.isAwaitingStoryContinuationChoice || false);
        setImageSnapshots(backupData.imageSnapshots || []); // Crucial for restoring images
      }


      if (mode === AppMode.CHESS_SIM_EXE) {
        setChessInitialFen(backupData.chessBoardFEN || INITIAL_BOARD_FEN);
        setChessInitialPlayer(backupData.chessCurrentPlayer);
        setChessInitialCoTAI1(backupData.chessCoTAI1 || "");
        setChessInitialCoTAI2(backupData.chessCoTAI2 || "");
        setChessInitialGameStatus(backupData.chessGameStatus);
      }
      if (mode === AppMode.NOOSPHERIC_CONQUEST_EXE && backupData.noosphericGameState) {
        setNoosphericInitialState(backupData.noosphericGameState);
        setNoosphericInitialMapType(backupData.noosphericMapType || "Global Conflict");
        setNoosphericGameStartedFromBackup(true);
      }
      if (mode === AppMode.CHIMERA_EXE && backupData.chimeraGameState) {
        setChimeraInitialGameState(backupData.chimeraGameState);
      }
      addMessageToHistory(SYSTEM_SENDER_NAME, `Session restored for ${mode}.`, undefined, false, false);
      
       if (mode === AppMode.STORY_WEAVER_EXE) {
         if (selectedStorySeed && !isAwaitingStoryContinuationChoice) { // if a story was loaded and not waiting for choice
             const fullStoryContext = backupData.conversationHistory.map(m => m.text).join("\n");
             generateContinuationOptions(fullStoryContext, selectedStorySeed);
         }
       } else if ((mode === AppMode.SEMANTIC_ESCAPE_EXE)) { 
         if (backupData.conversationHistory.length > 0) {
             const lastMsg = backupData.conversationHistory[backupData.conversationHistory.length -1];
             if (lastMsg.sender === FACILITATOR_SENDER_NAME || lastMsg.isUser || (nextAiToSpeakRef.current === 'AI1' && lastMsg.sender === AI2_NAME) || (nextAiToSpeakRef.current === 'AI2' && lastMsg.sender === AI1_NAME)) {
                setForceTurnCheckToken(prev => prev + 1);
             }
         }
       }

    } else { 
      let startMessages: ModeStartMessageSeed[] = [];
      switch (mode) {
        case AppMode.SEMANTIC_ESCAPE_EXE: startMessages = SEMANTIC_ESCAPE_EXE_MODE_START_MESSAGES; nextAiToSpeakRef.current = 'AI1'; break;
        case AppMode.UNIVERSE_SIM_EXE: addMessageToHistory(AI1_NAME, GEM_Q_INITIATION_PROMPT, undefined, false, true); break;
        case AppMode.CHESS_SIM_EXE: addMessageToHistory(SYSTEM_SENDER_NAME, CHESS_SIM_START_MESSAGE, undefined, false, false); break;
        case AppMode.NOOSPHERIC_CONQUEST_EXE:
             NOOSPHERIC_CONQUEST_EXE_MODE_START_MESSAGES.forEach(seed => addMessageToHistory(seed.sender, seed.text, seed.color, false, false));
             break;
        case AppMode.STORY_WEAVER_EXE: 
            // Handled above by setting isAwaitingSeedChoice and calling generateStorySeeds
            break;
        case AppMode.CHIMERA_EXE: startMessages = CHIMERA_EXE_MODE_START_MESSAGES; break;
        default: startMessages = [{ sender: SYSTEM_SENDER_NAME, text: `${mode} initialized.` }];
      }
      
      if (mode !== AppMode.STORY_WEAVER_EXE) { // Story Weaver start messages are handled by seed choice
        startMessages.forEach(seed => addMessageToHistory(seed.sender, seed.text, seed.color, false, false));
      }
       
        if (!fromBackup && (mode === AppMode.SEMANTIC_ESCAPE_EXE)) {
            setForceTurnCheckToken(prev => prev + 1);
        } else if (!fromBackup && mode === AppMode.UNIVERSE_SIM_EXE && conversationHistory.length === 1 && conversationHistory[0].text === GEM_Q_INITIATION_PROMPT) {
            addMessageToHistory(AI1_NAME, "world_sim>", undefined, false, false);
        }
    }
    setIsLoading(false);
  }, [addMessageToHistory, initializeAI, globalSelectedModelId, conversationHistory, generateStorySeeds, generateContinuationOptions, selectedStorySeed, lyriaPrompts, lyriaConfig]);


  const handleSaveCustomApiKey = useCallback((key: string) => {
    if (key.trim()) {
      localStorage.setItem(CUSTOM_API_KEY_STORAGE_KEY, key.trim());
      setUserDefinedApiKey(key.trim());
      setActiveApiKeySource('custom');
      addMessageToHistory(SYSTEM_SENDER_NAME, "Custom API Key saved. Re-initializing AI...", 'text-[var(--color-info)]', false, false);
      resetAndInitializeForNewMode(currentMode, false);
    } else {
       addMessageToHistory(SYSTEM_SENDER_NAME, "Custom API Key cannot be empty.", 'text-[var(--color-error)]', false, false);
    }
  }, [currentMode, addMessageToHistory, resetAndInitializeForNewMode]);

  const handleClearCustomApiKey = useCallback(() => {
    localStorage.removeItem(CUSTOM_API_KEY_STORAGE_KEY);
    setUserDefinedApiKey(null);
    addMessageToHistory(SYSTEM_SENDER_NAME, "Custom API Key cleared. Re-initializing AI with environment key (if available)...", 'text-[var(--color-info)]', false, false);
    resetAndInitializeForNewMode(currentMode, false);
  }, [currentMode, addMessageToHistory, resetAndInitializeForNewMode]);


  const handleEmergencyStopToggle = useCallback(() => {
    setIsEmergencyStopActive(prev => {
      const newState = !prev;
      if (newState) {
        addMessageToHistory(SYSTEM_SENDER_NAME, "EMERGENCY STOP ACTIVATED. All AI API calls halted.", 'text-[var(--color-error)] font-bold', false, false);
        setIsLoading(false);
        setActiveAINameForLoading(null);
        setCurrentTypingMessageId(null);
        if (lyriaSessionRef.current && (lyriaPlaybackState === 'playing' || lyriaPlaybackState === 'loading')) {
          lyriaSessionRef.current.pause();
          setLyriaPlaybackState('paused');
          setLyriaStatusMessage("Music paused due to Emergency Stop.");
        }
      } else {
        addMessageToHistory(SYSTEM_SENDER_NAME, "AI Calls Resumed. (Manual interaction may be needed to continue specific modes)", 'text-[var(--color-info)]', false, false);
        
        if (!isLoading && !isAwaitingUserInput && 
            (currentMode !== AppMode.CHESS_SIM_EXE && 
             currentMode !== AppMode.NOOSPHERIC_CONQUEST_EXE && 
             currentMode !== AppMode.CHIMERA_EXE &&
             currentMode !== AppMode.STORY_WEAVER_EXE)) { 
          setForceTurnCheckToken(prev => prev + 1);
        } else if (currentMode === AppMode.STORY_WEAVER_EXE && selectedStorySeed && !isAwaitingSeedChoice && !isAwaitingStoryContinuationChoice) {
           const fullStoryContext = conversationHistory.map(m => m.text).join("\n");
           generateContinuationOptions(fullStoryContext, selectedStorySeed);
        }
      }
      return newState;
    });
  }, [addMessageToHistory, isLoading, isAwaitingUserInput, currentMode, selectedStorySeed, isAwaitingSeedChoice, isAwaitingStoryContinuationChoice, generateContinuationOptions, conversationHistory, lyriaPlaybackState]);

  const handleGlobalModelChange = useCallback((modelId: string) => {
    setGlobalSelectedModelId(modelId);
    if (!isAwaitingInitialStart) {
      addMessageToHistory(SYSTEM_SENDER_NAME, `Global AI model changed to ${AVAILABLE_MODELS.find(m=>m.id === modelId)?.name || modelId}. Re-initializing current mode.`, 'text-[var(--color-info)]', false, false);
      resetAndInitializeForNewMode(currentMode, false);
    }
  }, [currentMode, isAwaitingInitialStart, addMessageToHistory, resetAndInitializeForNewMode]);


  const handleMatrixSettingsChange = useCallback(<K extends keyof MatrixSettings>(key: K, value: MatrixSettings[K]) => {
    setMatrixSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', activeTheme);
    const currentThemeColors = THEMES[activeTheme];
    if (currentThemeColors) {
      handleMatrixSettingsChange('matrixColor', currentThemeColors.matrixColor);
    }
  }, [activeTheme, handleMatrixSettingsChange]);

  const handleThemeChange = useCallback((themeName: ThemeName) => {
    setActiveTheme(themeName);
  }, []);

  const addToCommandHistory = (command: string) => {
    if (command.trim() === "") return;
    setCommandHistory(prev => {
      const newHistory = [command, ...prev.filter(c => c !== command)];
      return newHistory.slice(0, 50);
    });
  };

  const handleInitialStartInputChange = (value: string) => {
    setInitialStartInputText(value);
    commandHistoryIndexRef.current = -1;
  };

  const handleUserInputChange = (value: string) => {
    setUserInputText(value);
    commandHistoryIndexRef.current = -1;
  };

  const handleUniverseSimInputChange = (value: string) => {
    setUniverseSimInputText(value);
    commandHistoryIndexRef.current = -1;
  };

  useEffect(() => {
    if (!isAwaitingInitialStart && (conversationHistory.length === 0 || wasAwaitingUserInputRef.current)) {
      if (currentMode === AppMode.STORY_WEAVER_EXE && isAwaitingSeedChoice) {
        // Do nothing, seed choice will trigger initialization
      } else {
        resetAndInitializeForNewMode(currentMode, false);
      }
      wasAwaitingUserInputRef.current = false; 
    } else if (isAwaitingInitialStart && conversationHistory.length === 0) {
        addMessageToHistory(SYSTEM_SENDER_NAME, INITIAL_START_PROMPT_MESSAGE, undefined, false, false);
    }
  }, [currentMode, isAwaitingInitialStart, resetAndInitializeForNewMode, addMessageToHistory, conversationHistory.length, isAwaitingSeedChoice]);


  const handleInitialStartSubmit = useCallback(() => {
    const command = initialStartInputText.trim();
    addToCommandHistory(command);

    if (command.toUpperCase() === 'Y') {
      setInitialStartInputText("");
      wasAwaitingUserInputRef.current = true; 
      setIsAwaitingInitialStart(false);
    } else if (command.toUpperCase() === 'N') {
      setInitialStartInputText("");
      setCurrentMode(AppMode.UNIVERSE_SIM_EXE); 
      wasAwaitingUserInputRef.current = true; 
      setIsAwaitingInitialStart(false);
    } else {
      addMessageToHistory(SYSTEM_SENDER_NAME, "Invalid input. Please type 'Y' to confirm or 'N' to try the Geodesic Mind (Universe Sim).", undefined, false, false);
      setInitialStartInputText("");
    }
  }, [initialStartInputText, addMessageToHistory, addToCommandHistory]);


  const handleModeChange = (newMode: AppMode) => {
    if (isAwaitingInitialStart) { 
        setCurrentMode(newMode); 
    } else {
        setCurrentMode(newMode);
        resetAndInitializeForNewMode(newMode, false);
    }
  };

  const handleTypingComplete = (messageId: string) => { if(currentTypingMessageId === messageId) setCurrentTypingMessageId(null); };
  const handleCommandHistoryNavigation = (direction: 'up' | 'down', inputType: string) => { /* TODO: Implement command history logic */ };
  const handleUserPromptSubmit = () => { /* TODO: Process user input */ };

  const handleUniverseSimInputSubmit = () => { /* TODO: Process universe sim command */ };
  const handleCopyChat = () => { /* TODO: Implement copy */ };
  const handleExportTXT = () => { /* TODO: Implement TXT export */ };
  const handleExportMD = () => { /* TODO: Implement MD export */ };
  
  const handleBackupChat = () => { /* Generic Backup, needs refinement for Story Weaver */ };

  const handleSaveStoryWeaverSession = useCallback(() => {
    const backupData: ConversationBackup = {
      version: "1.1.0-sw",
      timestamp: new Date().toISOString(),
      mode: AppMode.STORY_WEAVER_EXE,
      personas: {
        ai1: { name: STORY_WEAVER_SENDER_NAME, systemPrompt: STORY_WEAVER_AI_SYSTEM_PROMPT },
        ai2: null,
      },
      conversationHistory: conversationHistory,
      imageSnapshots: imageSnapshots,
      selectedStorySeed: selectedStorySeed,
      storyContinuationOptions: storyContinuationOptions,
      isAwaitingSeedChoice: isAwaitingSeedChoice,
      isAwaitingStoryContinuationChoice: isAwaitingStoryContinuationChoice,
      lastGeneratedImageForStoryWeaver: lastGeneratedImageForStoryWeaver,
      storyWeaverTurnCount: storyWeaverTurnCount,
      turnCycleCount: 0, // Not used by Story Weaver
      nextAiToSpeak: 'STORY_WEAVER',
      themeName: activeTheme,
      typingSpeedMs: typingSpeedMs,
      globalSelectedModelId: globalSelectedModelId,
      lyriaPrompts: lyriaPrompts,
      lyriaConfig: lyriaConfig,
    };

    const jsonData = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
    a.download = `story_weaver_session_${timestamp}.json`;
    a.href = url;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addMessageToHistory(SYSTEM_SENDER_NAME, "Story Weaver session saved.", 'text-[var(--color-info)]', false, false);
  }, [
    conversationHistory, imageSnapshots, selectedStorySeed, storyContinuationOptions,
    isAwaitingSeedChoice, isAwaitingStoryContinuationChoice, lastGeneratedImageForStoryWeaver,
    storyWeaverTurnCount, activeTheme, typingSpeedMs, globalSelectedModelId, addMessageToHistory,
    lyriaPrompts, lyriaConfig
  ]);

  const handleLoadChat = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const result = e.target?.result as string;
          const backupData = JSON.parse(result) as ConversationBackup;
          
          if (!backupData.version || !backupData.mode || !backupData.conversationHistory) {
            throw new Error("Invalid backup file format.");
          }
          
          setCurrentMode(backupData.mode);
          resetAndInitializeForNewMode(backupData.mode, true, backupData);
          
        } catch (error: any) {
          console.error("Error loading backup:", error);
          addMessageToHistory(SYSTEM_SENDER_NAME, `Error loading backup: ${error instanceof Error ? error.message : 'Unknown error'}.`, 'text-[var(--color-error)]', false, false);
        }
      };
      reader.readAsText(file);
      event.target.value = ''; 
    }
  };
  
  const handleSendUserIntervention = (text: string, target: InterventionTarget) => {
    if (isEmergencyStopActive || isLoading) {
        addMessageToHistory(SYSTEM_SENDER_NAME, "Cannot send intervention while AI is stopped or busy.", 'text-[var(--color-error)]', false, false);
        return;
    }
    if (currentMode === AppMode.STORY_WEAVER_EXE) {
        addMessageToHistory(SYSTEM_SENDER_NAME, "User intervention is not applicable in Story Weaver mode during its current flow.", 'text-[var(--color-info)]', false, false);
        return;
    }

    addMessageToHistory(USER_INTERVENTION_SENDER_NAME, `Intervention for ${target}: "${text}"`, undefined, false, false);
    
    isUserInterventionPendingRef.current = true;
    pendingInterventionTextRef.current = text; 
    interventionTargetForPendingRef.current = target;

    queuedInterventionForAI1Ref.current = null; 
    queuedInterventionForAI2Ref.current = null;

    if (target === 'AI1') {
        queuedInterventionForAI1Ref.current = text; 
    } else if (target === 'AI2') {
        queuedInterventionForAI2Ref.current = text;
    }
    
    if (turnCycleCount < MAX_TURN_CYCLES || currentMode === AppMode.UNIVERSE_SIM_EXE) {
        makeAiRespond(); 
    } else {
        addMessageToHistory(FACILITATOR_SENDER_NAME, `Intervention received, but maximum turn cycles reached. AI will not respond further for this mode without reset.`, undefined, true, false);
        setIsAwaitingUserInput(true);
        isUserInterventionPendingRef.current = false; 
        pendingInterventionTextRef.current = null;
        interventionTargetForPendingRef.current = null;
    }
  };

  const handleCompleteCurrentMessage = () => { 
    setCurrentTypingMessageId(null); 
    setIsLoading(false); 
    setActiveAINameForLoading(null);
    if (currentMode !== AppMode.CHESS_SIM_EXE && 
        currentMode !== AppMode.NOOSPHERIC_CONQUEST_EXE && 
        currentMode !== AppMode.CHIMERA_EXE &&
        currentMode !== AppMode.STORY_WEAVER_EXE) { 
        setForceTurnCheckToken(prev => prev + 1);
    }
  };

  useEffect(() => {
    if (isEmergencyStopActive) return;
    if (isAwaitingInitialStart || isLoading || isAwaitingUserInput) return;

    if (currentMode === AppMode.CHESS_SIM_EXE || 
        currentMode === AppMode.NOOSPHERIC_CONQUEST_EXE || 
        currentMode === AppMode.CHIMERA_EXE ||
        currentMode === AppMode.STORY_WEAVER_EXE) { 
        return; 
    } 
        
    else { 
        const lastMessage = conversationHistory[conversationHistory.length - 1];
        if (isUserInterventionPendingRef.current) {
            if (turnCycleCount < MAX_TURN_CYCLES || currentMode === AppMode.UNIVERSE_SIM_EXE) {
                makeAiRespond();
            }
        } else if (lastMessage && (lastMessage.sender === SYSTEM_SENDER_NAME || lastMessage.sender === FACILITATOR_SENDER_NAME || lastMessage.isUser)) {
            if (turnCycleCount < MAX_TURN_CYCLES || currentMode === AppMode.UNIVERSE_SIM_EXE) {
                makeAiRespond();
            } else if (turnCycleCount >= MAX_TURN_CYCLES ) { 
                addMessageToHistory(FACILITATOR_SENDER_NAME, `Maximum turn cycles (${MAX_TURN_CYCLES}) reached. Awaiting user input.`, undefined, true, false); 
                setIsAwaitingUserInput(true);
            }
        }
    }
  }, [
    conversationHistory, currentMode, isLoading, isAwaitingInitialStart, 
    isAwaitingUserInput, turnCycleCount, addMessageToHistory, isEmergencyStopActive, 
    makeAiRespond, forceTurnCheckToken, 
  ]);

  // Helper to determine if Lyria is ready (excluding emergency stop)
  const isLyriaModuleReady = !!lyriaAiInstanceRef.current && !lyriaSessionErrorRef.current;


  const renderTerminalForDefaultModes = () => (
    <TerminalWindow
      title={`${currentMode.toUpperCase().replace("_EXE", ".EXE")} Interface`}
      messages={conversationHistory}
      isTypingActive={isLoading && !!currentTypingMessageId}
      activeTypingMessageId={currentTypingMessageId}
      onTypingComplete={handleTypingComplete}
      isPromptingUser={isAwaitingUserInput}
      userInputValue={userInputText}
      onUserInputChange={handleUserInputChange}
      onUserPromptSubmit={handleUserPromptSubmit}
      isAwaitingInitialStart={false} 
      typingSpeed={typingSpeedMs}
      isUniverseSimActivePhase2={currentMode === AppMode.UNIVERSE_SIM_EXE && conversationHistory.some(m => m.text.trim().endsWith("world_sim>"))}
      universeSimInputValue={universeSimInputText}
      onUniverseSimInputChange={handleUniverseSimInputChange}
      onUniverseSimInputSubmit={handleUniverseSimInputSubmit}
      currentMode={currentMode}
      commandHistory={commandHistory}
      onCommandHistoryNavigation={handleCommandHistoryNavigation}
      className="flex-grow h-full w-full"
      isAppAiProcessing={isLoading}
      appProcessingAiName={activeAINameForLoading}
    />
  );

  const renderModeContainer = () => {
    switch (currentMode) {
      case AppMode.CHESS_SIM_EXE:
        return (
          <ChessModeContainer
            ai1Chat={ai1ChatRef.current}
            ai2Chat={ai2ChatRef.current}
            genAI={genAI.current}
            apiKeyMissing={apiKeyMissingError}
            initialFen={chessInitialFen}
            initialPlayer={chessInitialPlayer}
            initialCoTAI1={chessInitialCoTAI1}
            initialCoTAI2={chessInitialCoTAI2}
            initialGameStatus={chessInitialGameStatus}
            chessResetToken={chessResetTokenRef.current}
            currentAppMode={currentMode}
            onModeChange={handleModeChange}
            activeTheme={activeTheme}
            onThemeChangeForApp={handleThemeChange}
            isAiReadyForChessFromApp={isAiReadyForChess}
            appInitializationError={initializationError}
            onOpenInfoModal={() => setIsInfoModalOpen(true)}
            lyriaPlaybackState={lyriaPlaybackState}
            onLyriaPlayPause={handleLyriaPlayPause}
            isLyriaReady={isLyriaModuleReady}
            isEmergencyStopActive={isEmergencyStopActive}
          />
        );
      case AppMode.NOOSPHERIC_CONQUEST_EXE:
        return (
          <NoosphericConquestContainer
            ai1Chat={ai1ChatRef.current}
            ai2Chat={ai2ChatRef.current}
            apiKeyMissing={apiKeyMissingError}
            initialGameState={noosphericInitialState}
            initialMapType={noosphericInitialMapType}
            isGameStartedFromBackup={noosphericGameStartedFromBackup}
            currentAppMode={currentMode}
            onModeChange={handleModeChange}
            activeTheme={activeTheme}
            isAiReadyForNoosphericFromApp={isAiReadyForNoospheric}
            appInitializationError={initializationError}
            onOpenInfoModal={() => setIsInfoModalOpen(true)}
            lyriaPlaybackState={lyriaPlaybackState}
            onLyriaPlayPause={handleLyriaPlayPause}
            isLyriaReady={isLyriaModuleReady}
            isEmergencyStopActive={isEmergencyStopActive}
          />
        );
      case AppMode.STORY_WEAVER_EXE:
        return (
          <StoryWeaverModeContainer
            genAI={genAI.current}
            messages={conversationHistory}
            addMessageToHistory={addMessageToHistory}
            isLoadingAI={isLoading}
            activeTypingMessageId={currentTypingMessageId}
            onTypingComplete={handleTypingComplete}
            typingSpeed={typingSpeedMs}
            storyWeaverTurnCount={storyWeaverTurnCount}
            snapshots={imageSnapshots}
            isGeneratingImage={isGeneratingImage}
            appInitializationError={initializationError}
            appIsLoadingAi={isLoading} 
            appLoadingAiName={activeAINameForLoading}
            storySeeds={storySeeds}
            selectedStorySeed={selectedStorySeed}
            isAwaitingSeedChoice={isAwaitingSeedChoice}
            onSelectStorySeed={handleSelectStorySeed}
            storyContinuationOptions={storyContinuationOptions}
            isAwaitingStoryContinuationChoice={isAwaitingStoryContinuationChoice}
            onSelectStoryContinuation={handleSelectStoryContinuation}
            onSaveStoryWeaver={handleSaveStoryWeaverSession} 
            onLoadStoryWeaver={handleLoadChat}
            onRequestNewStoryImage={handleRequestStoryWeaverImage}
          />
        );
      case AppMode.CHIMERA_EXE:
        return (
          <ChimeraModeContainer
            dmAiChat={chimeraDmAiChatRef.current}
            playerAiChat={chimeraPlayerAiChatRef.current}
            genAI={genAI.current}
            addMessageToHistory={addMessageToHistory}
            conversationHistory={conversationHistory}
            commandHistory={commandHistory}
            onCommandHistoryNavigation={handleCommandHistoryNavigation}
            typingSpeed={typingSpeedMs}
            onTypingComplete={handleTypingComplete}
            activeTypingMessageId={currentTypingMessageId} 
            onSaveGameRequest={handleBackupChat}
            onLoadGameRequest={handleLoadChat}
            initialGameState={chimeraInitialGameState}
            isEmergencyStopActive={isEmergencyStopActive}
            onEmergencyStopToggle={handleEmergencyStopToggle}
            currentMode={currentMode}
            onModeChange={handleModeChange}
            appInitializationError={initializationError}
            appIsLoadingAi={isLoading} 
            appLoadingAiName={activeAINameForLoading} 
          />
        );
      default:
        return renderTerminalForDefaultModes();
    }
  };

  const renderAppContent = () => {
    if (apiKeyMissingError && activeApiKeySource === 'missing') {
         return (
             <>
                <div className="md:w-2/3 lg:w-3/4 flex-grow h-full min-h-0 flex items-center justify-center">
                    <div className="p-6 bg-[var(--color-bg-panel)] border-2 border-[var(--color-error)] rounded-md shadow-lg text-center">
                        <h2 className="text-xl font-bold text-[var(--color-error)] mb-3">API Key Error</h2>
                        <p className="text-[var(--color-text-base)] mb-2">
                            A Gemini API key is required to run the application.
                        </p>
                        <p className="text-[var(--color-text-muted)] text-sm">
                            Please set the <code className="bg-black px-1 rounded">API_KEY</code> environment variable, or enter a custom key in the panel.
                        </p>
                         <p className="text-[var(--color-text-muted)] text-xs mt-4">
                            (App functionality will be limited until a key is provided)
                        </p>
                    </div>
                </div>
                 <ControlsPanel
                    matrixSettings={matrixSettings}
                    onMatrixSettingsChange={handleMatrixSettingsChange}
                    onCopyChat={handleCopyChat}
                    onExportTXT={handleExportTXT}
                    onExportMD={handleExportMD}
                    onBackupChat={handleBackupChat}
                    onLoadChat={handleLoadChat}
                    isAIsTyping={isLoading}
                    activeAIName={activeAINameForLoading}
                    currentMode={currentMode}
                    onModeChange={handleModeChange}
                    onSendUserIntervention={handleSendUserIntervention}
                    currentTypingSpeed={typingSpeedMs}
                    onTypingSpeedChange={setTypingSpeedMs}
                    onCompleteCurrentMessage={handleCompleteCurrentMessage}
                    activeTheme={activeTheme}
                    onThemeChange={handleThemeChange}
                    onOpenInfoModal={() => setIsInfoModalOpen(true)}
                    globalSelectedModelId={globalSelectedModelId}
                    onGlobalModelChange={handleGlobalModelChange}
                    isEmergencyStopActive={isEmergencyStopActive}
                    onEmergencyStopToggle={handleEmergencyStopToggle}
                    onSaveCustomApiKey={handleSaveCustomApiKey}
                    onClearCustomApiKey={handleClearCustomApiKey}
                    activeApiKeySource={activeApiKeySource}
                    initialCustomKeyValue={userDefinedApiKey || ""}
                    apiKeyMissingError={apiKeyMissingError}
                    // Lyria props
                    lyriaPrompts={lyriaPrompts}
                    lyriaConfig={lyriaConfig}
                    lyriaPlaybackState={lyriaPlaybackState}
                    lyriaStatusMessage={lyriaStatusMessage}
                    isLyriaModalOpen={isLyriaModalOpen}
                    onToggleLyriaModal={setIsLyriaModalOpen}
                    isLyriaSaveLoadModalOpen={isLyriaSaveLoadModalOpen}
                    onToggleLyriaSaveLoadModal={setIsLyriaSaveLoadModalOpen}
                    onAddLyriaPrompt={handleAddLyriaPrompt}
                    onRemoveLyriaPrompt={handleRemoveLyriaPrompt}
                    onLyriaPromptTextChange={handleLyriaPromptTextChange}
                    onLyriaPromptWeightChange={handleLyriaPromptWeightChange}
                    onLyriaConfigChange={handleLyriaConfigChange}
                    onLyriaPlayPause={handleLyriaPlayPause}
                    onLyriaResetContext={handleLyriaResetContext}
                    isLyriaReady={isLyriaModuleReady}
                    onSaveLyriaSettings={handleSaveLyriaSettings}
                    onLoadLyriaSettings={handleLoadLyriaSettings}
                />
             </>
         );
    }
    
    if (isAwaitingInitialStart) {
      return (
        <>
          <div className="md:w-2/3 lg:w-3/4 flex-grow h-full min-h-0">
            <TerminalWindow
              title="OVERMIND BOOT SEQUENCE"
              messages={conversationHistory}
              isTypingActive={isLoading && !!currentTypingMessageId}
              activeTypingMessageId={currentTypingMessageId}
              onTypingComplete={handleTypingComplete}
              isAwaitingInitialStart={true}
              initialStartPromptMessageText={INITIAL_START_PROMPT_MESSAGE}
              initialStartInputValue={initialStartInputText}
              onInitialStartInputChange={handleInitialStartInputChange}
              onInitialStartSubmit={handleInitialStartSubmit}
              isPromptingUser={false}
              userInputValue={userInputText}
              onUserInputChange={handleUserInputChange}
              onUserPromptSubmit={handleUserPromptSubmit}
              typingSpeed={typingSpeedMs}
              currentMode={currentMode}
              commandHistory={commandHistory}
              onCommandHistoryNavigation={handleCommandHistoryNavigation}
              className="flex-grow h-full w-full"
              isAppAiProcessing={isLoading}
              appProcessingAiName={activeAINameForLoading}
            />
          </div>
          <ControlsPanel
            matrixSettings={matrixSettings}
            onMatrixSettingsChange={handleMatrixSettingsChange}
            onCopyChat={handleCopyChat}
            onExportTXT={handleExportTXT}
            onExportMD={handleExportMD}
            onBackupChat={handleBackupChat}
            onLoadChat={handleLoadChat}
            isAIsTyping={isLoading}
            activeAIName={activeAINameForLoading}
            currentMode={currentMode}
            onModeChange={handleModeChange}
            onSendUserIntervention={handleSendUserIntervention}
            currentTypingSpeed={typingSpeedMs}
            onTypingSpeedChange={setTypingSpeedMs}
            onCompleteCurrentMessage={handleCompleteCurrentMessage}
            activeTheme={activeTheme}
            onThemeChange={handleThemeChange}
            onOpenInfoModal={() => setIsInfoModalOpen(true)}
            globalSelectedModelId={globalSelectedModelId}
            onGlobalModelChange={handleGlobalModelChange}
            isEmergencyStopActive={isEmergencyStopActive}
            onEmergencyStopToggle={handleEmergencyStopToggle}
            onSaveCustomApiKey={handleSaveCustomApiKey}
            onClearCustomApiKey={handleClearCustomApiKey}
            activeApiKeySource={activeApiKeySource}
            initialCustomKeyValue={userDefinedApiKey || ""}
            apiKeyMissingError={apiKeyMissingError}
            // Lyria props
            lyriaPrompts={lyriaPrompts}
            lyriaConfig={lyriaConfig}
            lyriaPlaybackState={lyriaPlaybackState}
            lyriaStatusMessage={lyriaStatusMessage}
            isLyriaModalOpen={isLyriaModalOpen}
            onToggleLyriaModal={setIsLyriaModalOpen}
            isLyriaSaveLoadModalOpen={isLyriaSaveLoadModalOpen}
            onToggleLyriaSaveLoadModal={setIsLyriaSaveLoadModalOpen}
            onAddLyriaPrompt={handleAddLyriaPrompt}
            onRemoveLyriaPrompt={handleRemoveLyriaPrompt}
            onLyriaPromptTextChange={handleLyriaPromptTextChange}
            onLyriaPromptWeightChange={handleLyriaPromptWeightChange}
            onLyriaConfigChange={handleLyriaConfigChange}
            onLyriaPlayPause={handleLyriaPlayPause}
            onLyriaResetContext={handleLyriaResetContext}
            isLyriaReady={isLyriaModuleReady}
            onSaveLyriaSettings={handleSaveLyriaSettings}
            onLoadLyriaSettings={handleLoadLyriaSettings}
          />
        </>
      );
    }

    switch (currentMode) {
      case AppMode.CHESS_SIM_EXE: 
      case AppMode.NOOSPHERIC_CONQUEST_EXE: 
      case AppMode.STORY_WEAVER_EXE: 
      case AppMode.CHIMERA_EXE: 
        return (
          <div className="flex-grow h-full w-full min-h-0">
            {renderModeContainer()}
          </div>
        );
      default: 
        return (
          <>
            <div className="md:w-2/3 lg:w-3/4 flex-grow h-full min-h-0">
              {renderModeContainer()}
            </div>
            <ControlsPanel
              matrixSettings={matrixSettings}
              onMatrixSettingsChange={handleMatrixSettingsChange}
              onCopyChat={handleCopyChat}
              onExportTXT={handleExportTXT}
              onExportMD={handleExportMD}
              onBackupChat={handleBackupChat}
              onLoadChat={handleLoadChat}
              isAIsTyping={isLoading}
              activeAIName={activeAINameForLoading}
              currentMode={currentMode}
              onModeChange={handleModeChange}
              onSendUserIntervention={handleSendUserIntervention}
              currentTypingSpeed={typingSpeedMs}
              onTypingSpeedChange={setTypingSpeedMs}
              onCompleteCurrentMessage={handleCompleteCurrentMessage}
              activeTheme={activeTheme}
              onThemeChange={handleThemeChange}
              onOpenInfoModal={() => setIsInfoModalOpen(true)}
              globalSelectedModelId={globalSelectedModelId}
              onGlobalModelChange={handleGlobalModelChange}
              isEmergencyStopActive={isEmergencyStopActive}
              onEmergencyStopToggle={handleEmergencyStopToggle}
              onSaveCustomApiKey={handleSaveCustomApiKey}
              onClearCustomApiKey={handleClearCustomApiKey}
              activeApiKeySource={activeApiKeySource}
              initialCustomKeyValue={userDefinedApiKey || ""}
              apiKeyMissingError={apiKeyMissingError}
              // Lyria props
              lyriaPrompts={lyriaPrompts}
              lyriaConfig={lyriaConfig}
              lyriaPlaybackState={lyriaPlaybackState}
              lyriaStatusMessage={lyriaStatusMessage}
              isLyriaModalOpen={isLyriaModalOpen}
              onToggleLyriaModal={setIsLyriaModalOpen}
              isLyriaSaveLoadModalOpen={isLyriaSaveLoadModalOpen}
              onToggleLyriaSaveLoadModal={setIsLyriaSaveLoadModalOpen}
              onAddLyriaPrompt={handleAddLyriaPrompt}
              onRemoveLyriaPrompt={handleRemoveLyriaPrompt}
              onLyriaPromptTextChange={handleLyriaPromptTextChange}
              onLyriaPromptWeightChange={handleLyriaPromptWeightChange}
              onLyriaConfigChange={handleLyriaConfigChange}
              onLyriaPlayPause={handleLyriaPlayPause}
              onLyriaResetContext={handleLyriaResetContext}
              isLyriaReady={isLyriaModuleReady}
              onSaveLyriaSettings={handleSaveLyriaSettings}
              onLoadLyriaSettings={handleLoadLyriaSettings}
            />
          </>
        );
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col md:flex-row bg-[var(--color-bg-page)] text-[var(--color-text-base)] overflow-hidden">
      <MatrixBackground
        settings={matrixSettings}
        onFPSUpdate={setFps}
        isProcessing={isLoading} 
      />
      <div className="relative flex flex-col md:flex-row flex-grow w-full h-full p-1 md:p-2 gap-1 md:gap-2 z-10">
        {renderAppContent()}
      </div>
      {isInfoModalOpen && MODE_INFO_CONTENT[currentMode] && (
        <InfoModal modeInfo={MODE_INFO_CONTENT[currentMode]!} onClose={() => setIsInfoModalOpen(false)} />
      )}
      <div id="app-version" data-version="1.11.0" className="hidden"></div>
      <div id="chess-mode-container-data" style={{ display: 'none' }}></div>
      <div id="noospheric-conquest-container-data" style={{ display: 'none' }}></div>
      <div id="chimera-mode-container-data" style={{ display: 'none' }}></div>
    </div>
  );
};

export { App };
