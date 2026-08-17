export interface RoboVoiceInput {
  start(): Promise<void>;
  stop(): Promise<void>;
}

export interface RoboVoiceOutput {
  speak(text: string, language: 'gu' | 'hi' | 'en'): Promise<void>;
  stop(): Promise<void>;
  replay?(): Promise<void>;
}
