import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { DEFAULT_ROBO_POSITION, type RoboPosition } from './robo-positions';
import { type RoboState } from './robo-states';
import { getRoboGuide, type GuideStep } from './robo-guides';
import { ROBO_OFFLINE_MESSAGE } from './robo-language';
import { roboService, type RoboChatMessage } from '@/services/robo-service';
import { getApiErrorMessage } from '@/utils/api-error';

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
  openChat: () => void;
  closeChat: () => void;
  minimize: () => void;
  hide: () => void;
  show: () => void;
  setPosition: (position: RoboPosition) => void;
  setState: (state: RoboState) => void;
  send: (content: string) => Promise<void>;
  retry: () => Promise<void>;
  clear: () => void;
  startGuide: (guideId: string) => void;
  nextGuideStep: () => void;
}

const RoboContext = createContext<RoboContextValue | null>(null);

export function RoboProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [position, setPosition] = useState<RoboPosition>(DEFAULT_ROBO_POSITION);
  const [state, setState] = useState<RoboState>('idle');
  const [online, setOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );
  const [messages, setMessages] = useState<RoboChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastPrompt, setLastPrompt] = useState<string | null>(null);
  const [guideSteps, setGuideSteps] = useState<GuideStep[]>([]);
  const [guideIndex, setGuideIndex] = useState(0);

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

  const send = useCallback(
    async (content: string) => {
      const text = content.trim();
      if (!text) return;
      if (!online) {
        setState('offline');
        setError(null);
        setMessages((current) => [
          ...current,
          { role: 'user' as const, content: text },
          { role: 'assistant' as const, content: ROBO_OFFLINE_MESSAGE },
        ]);
        return;
      }

      const nextMessages: RoboChatMessage[] = [...messages, { role: 'user' as const, content: text }].slice(
        -8,
      );
      setMessages(nextMessages);
      setLastPrompt(text);
      setLoading(true);
      setError(null);
      setState('thinking');
      try {
        const result = await roboService.chat(nextMessages);
        setMessages((current) =>
          [...current, { role: 'assistant' as const, content: result.reply }].slice(-8),
        );
        setState((result.state as RoboState) || 'talking');
        if (result.guideId) startGuide(result.guideId);
      } catch (err) {
        const message = getApiErrorMessage(err, ROBO_OFFLINE_MESSAGE);
        setError(message);
        setState('confused');
      } finally {
        setLoading(false);
      }
    },
    [messages, online, startGuide],
  );

  const retry = useCallback(async () => {
    if (lastPrompt) await send(lastPrompt);
  }, [lastPrompt, send]);

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
      },
      show: () => setVisible(true),
      setPosition,
      setState,
      send,
      retry,
      clear: () => {
        setMessages([]);
        setError(null);
        setGuideSteps([]);
        setState('idle');
      },
      startGuide,
      nextGuideStep,
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
      send,
      retry,
      startGuide,
      nextGuideStep,
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
