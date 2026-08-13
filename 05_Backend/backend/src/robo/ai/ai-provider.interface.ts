export interface AiChatInput {
  language: 'gu' | 'hi' | 'en';
  messages: { role: 'user' | 'assistant'; content: string }[];
  toolResults: { name: string; result: unknown }[];
  guideHint?: string;
}

export interface AiChatOutput {
  reply: string;
  provider: string;
}

export interface AiProvider {
  readonly name: string;
  isConfigured(): boolean;
  chat(input: AiChatInput): Promise<AiChatOutput>;
}
