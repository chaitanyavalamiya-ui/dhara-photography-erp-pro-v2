import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  it('denies unauthenticated requests on protected routes', () => {
    const guard = new JwtAuthGuard({} as Reflector);

    expect(() => guard.handleRequest(null, null as never)).toThrow(UnauthorizedException);
    expect(() => guard.handleRequest(null, null as never)).toThrow('Authentication required.');
  });
});
