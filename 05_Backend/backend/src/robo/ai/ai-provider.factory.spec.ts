import { ConfigService } from '@nestjs/config';
import { AiProviderFactory } from './ai-provider.factory';
import { GeminiAiProvider } from './gemini.provider';
import { LocalErpAiProvider } from './local-erp.provider';

describe('AiProviderFactory', () => {
  const gemini = { name: 'gemini', isConfigured: jest.fn(), chat: jest.fn() };
  const local = { name: 'local-erp', isConfigured: () => true, chat: jest.fn() };

  it('uses Gemini only when requested and configured', () => {
    const config = { get: jest.fn().mockReturnValue('gemini') };
    gemini.isConfigured.mockReturnValue(true);
    const factory = new AiProviderFactory(
      config as unknown as ConfigService,
      gemini as unknown as GeminiAiProvider,
      local as unknown as LocalErpAiProvider,
    );
    expect(factory.get().name).toBe('gemini');
  });

  it('falls back to the local ERP provider when Gemini is unavailable', () => {
    const config = { get: jest.fn().mockReturnValue('gemini') };
    gemini.isConfigured.mockReturnValue(false);
    const factory = new AiProviderFactory(
      config as unknown as ConfigService,
      gemini as unknown as GeminiAiProvider,
      local as unknown as LocalErpAiProvider,
    );
    expect(factory.get().name).toBe('local-erp');
  });
});
