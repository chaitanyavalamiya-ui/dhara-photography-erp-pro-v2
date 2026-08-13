import { ConfigService } from '@nestjs/config';
import { GeminiAiProvider } from './gemini.provider';

describe('GeminiAiProvider', () => {
  const config = { get: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    config.get.mockImplementation((key: string, fallback?: string) => {
      if (key === 'GEMINI_API_KEY') return 'test-key';
      if (key === 'GEMINI_MODEL') return fallback ?? 'gemini-2.0-flash';
      return fallback;
    });
  });

  it('throws when the provider is unavailable', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503 }) as never;
    const provider = new GeminiAiProvider(config as unknown as ConfigService);
    await expect(
      provider.chat({ language: 'en', messages: [{ role: 'user', content: 'hi' }], toolResults: [] }),
    ).rejects.toThrow(/unavailable/i);
  });

  it('throws on a malformed AI response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ candidates: [{}] }),
    }) as never;
    const provider = new GeminiAiProvider(config as unknown as ConfigService);
    await expect(
      provider.chat({ language: 'en', messages: [{ role: 'user', content: 'hi' }], toolResults: [] }),
    ).rejects.toThrow(/Malformed/);
  });
});
