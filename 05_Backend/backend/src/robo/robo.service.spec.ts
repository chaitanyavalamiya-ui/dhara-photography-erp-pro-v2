import { BadRequestException, ForbiddenException, ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { RoboService } from './robo.service';
import { RoboToolsService } from './robo-tools.service';
import { AiProviderFactory } from './ai/ai-provider.factory';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

describe('RoboService', () => {
  let service: RoboService;
  const tools = { execute: jest.fn() };
  const provider = { chat: jest.fn(), name: 'local-erp', isConfigured: () => true };
  const factory = { get: jest.fn(() => provider) };

  const user: JwtPayload = {
    sub: 'user-1',
    email: 'a@example.com',
    companyId: 'company-1',
    permissions: ['bookings.read'],
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    tools.execute.mockResolvedValue([{ id: 'b1', eventType: 'Wedding' }]);
    provider.chat.mockResolvedValue({ reply: 'આજે 1 booking છે.', provider: 'local-erp' });
    const module = await Test.createTestingModule({
      providers: [
        RoboService,
        { provide: RoboToolsService, useValue: tools },
        { provide: AiProviderFactory, useValue: factory },
      ],
    }).compile();
    service = module.get(RoboService);
  });

  it('requires a user message', async () => {
    await expect(service.chat(user, { messages: [] })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an invalid requested tool', async () => {
    await expect(
      service.chat(user, { messages: [{ role: 'user', content: 'hi' }], requestedTool: 'hack' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('uses today bookings for a Gujarati booking question', async () => {
    const result = await service.chat(user, {
      messages: [{ role: 'user', content: 'આજે કેટલા booking છે?' }],
    });
    expect(tools.execute).toHaveBeenCalledWith(
      user,
      expect.objectContaining({ name: 'get_today_bookings' }),
    );
    expect(result.language).toBe('gu');
    expect(result.reply).toContain('booking');
  });

  it('keeps follow-up context bounded to recent messages', async () => {
    await service.chat(user, {
      messages: [
        { role: 'user', content: 'આજે કેટલા booking છે?' },
        { role: 'assistant', content: 'આજે 4 bookings છે.' },
        { role: 'user', content: 'એમાંથી wedding કેટલા?' },
      ],
    });
    expect(provider.chat).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([{ role: 'user', content: 'એમાંથી wedding કેટલા?' }]),
      }),
    );
  });

  it('maps ERP tool failure to unavailable', async () => {
    tools.execute.mockRejectedValue(new Error('db down'));
    await expect(
      service.chat(user, { messages: [{ role: 'user', content: 'today bookings' }] }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('does not hide permission errors as provider failures', async () => {
    tools.execute.mockRejectedValue(new ForbiddenException('Not permitted to use get_today_bookings.'));
    await expect(
      service.chat(user, { messages: [{ role: 'user', content: 'today bookings' }] }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('maps provider failure to unavailable', async () => {
    provider.chat.mockRejectedValue(new Error('Gemini unavailable (503).'));
    await expect(
      service.chat(user, { messages: [{ role: 'user', content: 'Hello' }] }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('interprets this month for date questions', async () => {
    await service.chat(user, { messages: [{ role: 'user', content: 'this month bookings' }] });
    expect(tools.execute).toHaveBeenCalledWith(
      user,
      expect.objectContaining({ name: 'get_bookings_for_range' }),
    );
  });
});
