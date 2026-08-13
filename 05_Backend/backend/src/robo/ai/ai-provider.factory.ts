import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProvider } from './ai-provider.interface';
import { GeminiAiProvider } from './gemini.provider';
import { LocalErpAiProvider } from './local-erp.provider';

@Injectable()
export class AiProviderFactory {
  constructor(
    private readonly config: ConfigService,
    private readonly gemini: GeminiAiProvider,
    private readonly local: LocalErpAiProvider,
  ) {}

  get(): AiProvider {
    const requested = (this.config.get<string>('ROBO_AI_PROVIDER') ?? 'local').trim().toLowerCase();
    if (requested === 'gemini' && this.gemini.isConfigured()) {
      return this.gemini;
    }
    return this.local;
  }
}
