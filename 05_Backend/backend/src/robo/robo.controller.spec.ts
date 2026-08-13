import { readFileSync } from 'fs';
import { join } from 'path';
import { RoboController } from './robo.controller';
import { RoboService } from './robo.service';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

describe('RoboController', () => {
  const source = readFileSync(join(__dirname, 'robo.controller.ts'), 'utf8');

  it('requires JWT authentication (not a public route)', () => {
    expect(source).not.toContain('@Public()');
    expect(source).toContain('@ApiBearerAuth()');
  });

  it('passes the authenticated user into the Robo service', async () => {
    const roboService = { chat: jest.fn().mockResolvedValue({ reply: 'ok' }) };
    const controller = new RoboController(roboService as unknown as RoboService);
    const user: JwtPayload = {
      sub: 'user-1',
      email: 'a@example.com',
      companyId: 'company-1',
      permissions: ['bookings.read'],
    };
    await controller.chat(user, { messages: [{ role: 'user', content: 'hi' }] });
    expect(roboService.chat).toHaveBeenCalledWith(user, {
      messages: [{ role: 'user', content: 'hi' }],
    });
  });
});
