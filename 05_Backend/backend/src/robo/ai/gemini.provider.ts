import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiChatInput, AiChatOutput, AiProvider } from './ai-provider.interface';

@Injectable()
export class GeminiAiProvider implements AiProvider {
  readonly name = 'gemini';

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.config.get<string>('GEMINI_API_KEY')?.trim());
  }

  async chat(input: AiChatInput): Promise<AiChatOutput> {
    const key = this.config.get<string>('GEMINI_API_KEY')?.trim();
    if (!key) {
      throw new Error('GEMINI_API_KEY is not configured.');
    }

    const model = this.config.get<string>('GEMINI_MODEL', 'gemini-2.0-flash');
    const system = [
      'You are Robo, a friendly Dhara Photography ERP assistant in Patan.',
      'Answer in the user language. Supported: Gujarati, Hindi, English.',
      'Use only the provided ERP tool results for studio data. Never invent numbers.',
      'Do not claim to create, edit, or delete ERP records. This phase is read-only.',
      'Keep replies concise and helpful.',
      input.guideHint ? `If relevant, mention this UI guide: ${input.guideHint}` : '',
    ]
      .filter(Boolean)
      .join(' ');

    const contents = [
      {
        role: 'user',
        parts: [
          {
            text: `${system}\n\nTool results:\n${JSON.stringify(input.toolResults).slice(0, 8000)}\n\nConversation:\n${input.messages
              .map((message) => `${message.role}: ${message.content}`)
              .join('\n')}`,
          },
        ],
      },
    ];

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents }),
        signal: AbortSignal.timeout(15000),
      },
    );

    if (!response.ok) {
      throw new Error(`Gemini unavailable (${response.status}).`);
    }

    const payload = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const reply = payload.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!reply) {
      throw new Error('Malformed AI response.');
    }

    return { reply, provider: this.name };
  }
}
