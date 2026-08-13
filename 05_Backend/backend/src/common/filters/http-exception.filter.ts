import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AUTH_ERROR_CODES } from '../../auth/auth-error.codes';
import { getLoginSecurityConfig } from '../../auth/login-security.config';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'An unexpected error occurred.';
    let errors: string[] | undefined;
    let code: string | undefined;
    let retryAfterSeconds: number | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const body = exceptionResponse as Record<string, unknown>;
        message = (body.message as string) ?? message;
        if (Array.isArray(body.message)) {
          errors = body.message as string[];
          message = 'Validation failed.';
        }
        if (typeof body.code === 'string') {
          code = body.code;
        }
        if (typeof body.retryAfterSeconds === 'number') {
          retryAfterSeconds = body.retryAfterSeconds;
        }
      }

      if (status === HttpStatus.TOO_MANY_REQUESTS) {
        code = AUTH_ERROR_CODES.TOO_MANY_REQUESTS;
        message = 'Too many requests. Please try again later.';
        retryAfterSeconds = this.resolveRetryAfterSeconds(request, response, retryAfterSeconds);
      }
    } else {
      this.logger.error('Unhandled exception', exception);
    }

    response.status(status).json({
      success: false,
      message,
      errors,
      code,
      retryAfterSeconds,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private resolveRetryAfterSeconds(
    request: Request,
    response: Response,
    existing?: number,
  ): number {
    if (typeof existing === 'number' && existing > 0) {
      return existing;
    }

    const header = response.getHeader('Retry-After');
    const headerValue = Array.isArray(header) ? header[0] : header;
    const parsedHeader = Number(headerValue);
    if (Number.isFinite(parsedHeader) && parsedHeader > 0) {
      return Math.ceil(parsedHeader);
    }

    const securityConfig = getLoginSecurityConfig();
    const path = request.url ?? '';
    if (path.includes('/auth/refresh')) {
      return Math.ceil(securityConfig.refreshThrottleTtlMs / 1000);
    }
    return Math.ceil(securityConfig.loginThrottleTtlMs / 1000);
  }
}
