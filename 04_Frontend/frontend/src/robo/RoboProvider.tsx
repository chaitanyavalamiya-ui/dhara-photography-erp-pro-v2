import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { DEFAULT_ROBO_POSITION, type RoboPosition } from './robo-positions';
import { type RoboState } from './robo-states';
import { getRoboGuide, type GuideStep } from './robo-guides';
import { detectRoboLanguage, ROBO_OFFLINE_MESSAGE, type RoboLanguage } from './robo-language';
import { detectRoboCommand, rememberRoboUse } from './robo-commands';
import { roboService, type RoboChatMessage } from '@/services/robo-service';
import { getApiErrorMessage } from '@/utils/api-error';
import { createBrowserVoiceInput, createBrowserVoiceOutput, isRoboVoiceInputAvailable } from './robo-voice.browser';
import type { RoboVoiceInput } from './robo-voice';

interface RoboContextValue {
  visible: boolean;
  chatOpen: boolean;
  minimized: boolean;
  position: RoboPosition;
  state: RoboState;
  online: boolean;
  messages: RoboChatMessage[];
  loading: boolean;
  error: string | null;
  highlightTarget: string | null;
  isGuiding: boolean;
  listening: boolean;
  speaking: boolean;
  voiceMuted: boolean;
  lastSpoken: string | null;
  lastHeard: string | null;
  navigationTarget: string | null;
  voiceInputAvailable: boolean;
  openChat: () => void;
  closeChat: () => void;
  minimize: () => void;
  hide: () => void;
  show: () => void;
  setPosition: (position: RoboPosition) => void;
  setState: (state: RoboState) => void;
  setRoboState: (state: RoboState) => void;
  send: (content: string) => Promise<void>;
  retry: () => Promise<void>;
  clear: () => void;
  startGuide: (guideId: string) => void;
  nextGuideStep: () => void;
  moveToTarget: (target: string) => void;
  stopMovement: () => void;
  onArrived: () => void;
  startListening: () => void;
  stopListening: () => void;
  toggleMute: () => void;
  replayLast: () => void;
  stopSpeaking: () => void;
}

const RoboContext = createContext<RoboContextValue | null>(null);

export function RoboProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [position, setPosition] = useState<RoboPosition>(DEFAULT_ROBO_POSITION);
  const [state, setState] = useState<RoboState>('idle');
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [messages, setMessages] = useState<RoboChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastPrompt, setLastPrompt] = useState<string | null>(null);
  const [guideSteps, setGuideSteps] = useState<GuideStep[]>([]);
  const [guideIndex, setGuideIndex] = useState(0);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceMuted, setVoiceMuted] = useState(false);
  const [lastSpoken, setLastSpoken] = useState<string | null>(null);
  const [lastHeard, setLastHeard] = useState<string | null>(null);
  const [navigationTarget, setNavigationTarget] = useState<string | null>(null);
  const [arriveState, setArriveState] = useState<RoboState>('talking');
  const voiceInRef = useRef<RoboVoiceInput | null>(null);
  const voiceOutRef = useRef(createBrowserVoiceOutput());
  const languageRef = useRef<RoboLanguage>('gu');
  const mutedRef = useRef(false);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => {
      setOnline(false);
      setState('offline');
    };
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  const highlightTarget = guideSteps[guideIndex]?.target ?? null;

  const stopSpeaking = useCallback(async () => {
    await voiceOutRef.current.stop();
    setSpeaking(false);
  }, []);

  const speakReply = useCallback(async (text: string, language?: RoboLanguage) => {
    if (!text) return;
    const lang = language ?? detectRoboLanguage(text);
    languageRef.current = lang;
    setLastSpoken(text);
    if (mutedRef.current) return;
    setSpeaking(true);
    try {
      await voiceOutRef.current.speak(text, lang);
    } finally {
      setSpeaking(false);
    }
  }, []);

  const applyStep = useCallback(
    (step: GuideStep) => {
      if (step.route) navigate(step.route);
      if (step.position) setPosition(step.position);
      setState(step.state ?? 'guiding');
    },
    [navigate],
  );

  const startGuide = useCallback(
    (guideId: string) => {
      const guide = getRoboGuide(guideId);
      if (!guide) return;
      setGuideSteps(guide.steps);
      setGuideIndex(0);
      applyStep(guide.steps[0]);
    },
    [applyStep],
  );

  const nextGuideStep = useCallback(() => {
    setGuideIndex((current) => {
      const next = current + 1;
      if (next >= guideSteps.length) {
        setGuideSteps([]);
        setState('happy');
        return 0;
      }
      applyStep(guideSteps[next]);
      return next;
    });
  }, [applyStep, guideSteps]);

  const moveToTarget = useCallback((target: string) => {
    setNavigationTarget(target);
    setArriveState('talking');
    setState('walking');
  }, []);

  const stopMovement = useCallback(() => {
    setNavigationTarget(null);
    setState((current) => (current === 'walking' ? 'idle' : current));
  }, []);

  const onArrived = useCallback(() => {
    setNavigationTarget(null);
    setState(arriveState);
  }, [arriveState]);

  const send = useCallback(
    async (content: string) => {
      const text = content.trim();
      if (!text) return;
      rememberRoboUse(text);
      languageRef.current = detectRoboLanguage(text);
      const command = detectRoboCommand(text);
      if (command?.kind === 'guide') {
        setError(null);
        setLastPrompt(text);
        setMessages((current) =>
          [
            ...current,
            { role: 'user' as const, content: text },
            { role: 'assistant' as const, content: command.reply },
          ].slice(-8),
        );
        startGuide(command.guideId);
        void speakReply(command.reply, detectRoboLanguage(text));
        return;
      }
      if (command?.kind === 'goto') {
        setError(null);
        setLastPrompt(text);
        setMessages((current) =>
          [
            ...current,
            { role: 'user' as const, content: text },
            { role: 'assistant' as const, content: command.reply },
          ].slice(-8),
        );
        navigate(command.route);
        if (command.position) setPosition(command.position);
        setArriveState(command.state);
        setNavigationTarget(command.target);
        setState('walking');
        void speakReply(command.reply, detectRoboLanguage(text));
        return;
      }
      if (command?.kind === 'ask') {
        navigate(command.route);
        if (command.position) setPosition(command.position);
        setState(command.state);
      }
      if (!online) {
        setState('offline');
        setError(null);
        setMessages((current) => [
          ...current,
          { role: 'user' as const, content: text },
          { role: 'assistant' as const, content: ROBO_OFFLINE_MESSAGE },
        ]);
        void speakReply(ROBO_OFFLINE_MESSAGE, 'gu');
        return;
      }

      const nextMessages: RoboChatMessage[] = [...messages, { role: 'user' as const, content: text }].slice(-8);
      setMessages(nextMessages);
      setLastPrompt(text);
      setLoading(true);
      setError(null);
      setState('thinking');
      try {
        const result = await roboService.chat(nextMessages);
        setMessages((current) => [...current, { role: 'assistant' as const, content: result.reply }].slice(-8));
        setState((result.state as RoboState) || 'talking');
        if (result.guideId) startGuide(result.guideId);
        void speakReply(result.reply, detectRoboLanguage(text));
      } catch (err) {
        const message = getApiErrorMessage(err, ROBO_OFFLINE_MESSAGE);
        setError(message);
        setState('confused');
      } finally {
        setLoading(false);
      }
    },
    [messages, online, startGuide, navigate, speakReply],
  );

  const retry = useCallback(async () => {
    if (lastPrompt) await send(lastPrompt);
  }, [lastPrompt, send]);

  const stopListening = useCallback(() => {
    void voiceInRef.current?.stop();
    voiceInRef.current = null;
    setListening(false);
  }, []);

  const startListening = useCallback(() => {
    if (listening) {
      stopListening();
      return;
    }
    const input = createBrowserVoiceInput(
      (spoken) => {
        setLastHeard(spoken);
        setListening(false);
        voiceInRef.current = null;
        void send(spoken);
      },
      languageRef.current,
      {
        onStart: () => {
          setListening(true);
          setState('listening');
        },
        onEnd: () => setListening(false),
        onError: () => {
          setListening(false);
          setState('confused');
        },
        onTranscript: (spoken) => setLastHeard(spoken),
      },
    );
    voiceInRef.current = input;
    void input?.start().catch(() => {
      setListening(false);
      setState('confused');
    });
  }, [listening, send, stopListening]);

  const toggleMute = useCallback(() => {
    setVoiceMuted((current) => {
      const next = !current;
      mutedRef.current = next;
      if (next) void voiceOutRef.current.stop();
      return next;
    });
  }, []);

  const replayLast = useCallback(() => {
    if (!lastSpoken || mutedRef.current) return;
    setSpeaking(true);
    void voiceOutRef.current.replay?.().finally(() => setSpeaking(false));
  }, [lastSpoken]);

  const value = useMemo<RoboContextValue>(
    () => ({
      visible,
      chatOpen,
      minimized,
      position,
      state,
      online,
      messages,
      loading,
      error,
      highlightTarget,
      isGuiding: guideSteps.length > 0,
      listening,
      speaking,
      voiceMuted,
      lastSpoken,
      lastHeard,
      navigationTarget,
      voiceInputAvailable: isRoboVoiceInputAvailable(),
      openChat: () => {
        setChatOpen(true);
        setMinimized(false);
        setVisible(true);
        setState(online ? 'greeting' : 'offline');
      },
      closeChat: () => {
        setChatOpen(false);
        setState('idle');
      },
      minimize: () => {
        setMinimized(true);
        setChatOpen(false);
      },
      hide: () => {
        setVisible(false);
        setChatOpen(false);
        setNavigationTarget(null);
        setListening(false);
        void voiceInRef.current?.stop();
        void voiceOutRef.current.stop();
        setState('hidden');
      },
      show: () => {
        setVisible(true);
        setState('idle');
      },
      setPosition,
      setState,
      setRoboState: setState,
      send,
      retry,
      clear: () => {
        setMessages([]);
        setError(null);
        setGuideSteps([]);
        setNavigationTarget(null);
        setState('idle');
      },
      startGuide,
      nextGuideStep,
      moveToTarget,
      stopMovement,
      onArrived,
      startListening,
      stopListening,
      toggleMute,
      replayLast,
      stopSpeaking,
    }),
    [
      visible,
      chatOpen,
      minimized,
      position,
      state,
      online,
      messages,
      loading,
      error,
      highlightTarget,
      guideSteps.length,
      listening,
      speaking,
      voiceMuted,
      lastSpoken,
      lastHeard,
      navigationTarget,
      send,
      retry,
      startGuide,
      nextGuideStep,
      moveToTarget,
      stopMovement,
      onArrived,
      startListening,
      stopListening,
      toggleMute,
      replayLast,
      stopSpeaking,
    ],
  );

  return <RoboContext.Provider value={value}>{children}</RoboContext.Provider>;
}

export function useRobo(): RoboContextValue {
  const context = useContext(RoboContext);
  if (!context) {
    throw new Error('useRobo must be used within RoboProvider');
  }
  return context;
}
