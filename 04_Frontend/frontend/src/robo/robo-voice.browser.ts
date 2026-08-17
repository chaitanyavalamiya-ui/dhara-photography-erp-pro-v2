import type { RoboLanguage } from './robo-language';
import type { RoboVoiceInput, RoboVoiceOutput } from './robo-voice';

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start(): void;
  stop(): void;
};

export type RoboVoiceHooks = {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
  onTranscript?: (text: string) => void;
};

function recognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === 'undefined') return null;
  const speech = window as Window & {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return speech.SpeechRecognition ?? speech.webkitSpeechRecognition ?? null;
}

export function isRoboVoiceInputAvailable(): boolean {
  return Boolean(recognitionCtor());
}

export function isRoboVoiceOutputAvailable(): boolean {
  return typeof window !== 'undefined' && Boolean(window.speechSynthesis);
}

export function createBrowserVoiceInput(
  onText: (text: string) => void,
  language: RoboLanguage = 'gu',
  hooks: RoboVoiceHooks = {},
): RoboVoiceInput | null {
  const Ctor = recognitionCtor();
  if (!Ctor) return null;
  let active: SpeechRecognitionLike | null = null;
  return {
    async start() {
      const rec = new Ctor();
      rec.lang = language === 'hi' ? 'hi-IN' : language === 'en' ? 'en-IN' : 'gu-IN';
      rec.interimResults = false;
      rec.continuous = false;
      rec.onstart = () => hooks.onStart?.();
      rec.onresult = (event) => {
        const spoken = event.results[0]?.[0]?.transcript?.trim();
        if (spoken) {
          hooks.onTranscript?.(spoken);
          onText(spoken);
        }
      };
      rec.onerror = (event) => hooks.onError?.(event.error || 'voice-error');
      rec.onend = () => {
        active = null;
        hooks.onEnd?.();
      };
      active = rec;
      rec.start();
    },
    async stop() {
      active?.stop();
      active = null;
    },
  };
}

export function createBrowserVoiceOutput(): RoboVoiceOutput {
  let last: { text: string; language: RoboLanguage } | null = null;
  const speakNow = (text: string, language: RoboLanguage) =>
    new Promise<void>((resolve) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        resolve();
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === 'hi' ? 'hi-IN' : language === 'en' ? 'en-IN' : 'gu-IN';
      utterance.rate = 1;
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      window.speechSynthesis.speak(utterance);
    });

  return {
    async speak(text: string, language: RoboLanguage) {
      last = { text, language };
      await speakNow(text, language);
    },
    async stop() {
      if (typeof window === 'undefined' || !window.speechSynthesis) return;
      window.speechSynthesis.cancel();
    },
    async replay() {
      if (!last) return;
      await speakNow(last.text, last.language);
    },
  };
}
