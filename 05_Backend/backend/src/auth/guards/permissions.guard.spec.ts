import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ANY_PERMISSIONS_KEY, PERMISSIONS_KEY } from '../../common/decorators/auth.decorators';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { PermissionsGuard } from './permissions.guard';

describe('PermissionsGuard (Robo chat)', () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  };

  function createContext(user?: JwtPayload): ExecutionContext {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as ExecutionContext;
  }

  function requireRoboChat(): void {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === PERMISSIONS_KEY) {
        return ['robo.chat'];
      }
      if (key === ANY_PERMISSIONS_KEY) {
        return undefined;
      }
      return undefined;
    });
  }

  it('allows an authenticated user who has robo.chat', () => {
    requireRoboChat();
    const guard = new PermissionsGuard(reflector as unknown as Reflector);
    const user: JwtPayload = {
      sub: 'user-1',
      email: 'owner@example.com',
      companyId: 'company-1',
      permissions: ['robo.chat', 'bookings.read'],
    };

    expect(guard.canActivate(createContext(user))).toBe(true);
  });

  it('denies an authenticated user who does not have robo.chat', () => {
    requireRoboChat();
    const guard = new PermissionsGuard(reflector as unknown as Reflector);
    const user: JwtPayload = {
      sub: 'user-2',
      email: 'viewer@example.com',
      companyId: 'company-1',
      permissions: ['bookings.read', 'reports.read'],
    };

    expect(() => guard.canActivate(createContext(user))).toThrow(ForbiddenException);
    expect(() => guard.canActivate(createContext(user))).toThrow('Insufficient permissions.');
  });

  it('denies a request with required permissions but no authenticated user', () => {
    requireRoboChat();
    const guard = new PermissionsGuard(reflector as unknown as Reflector);

    expect(() => guard.canActivate(createContext(undefined))).toThrow(ForbiddenException);
    expect(() => guard.canActivate(createContext(undefined))).toThrow('Authentication required.');
  });
});
