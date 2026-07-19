import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { AppError, ErrorCodes } from './errors';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof AppError) {
      return response.status(exception.httpStatus).json({
        code: exception.code,
        message: exception.message,
        data: null,
      });
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const message =
        typeof body === 'string'
          ? body
          : ((body as { message?: string | string[] }).message ??
            exception.message);
      const normalized = Array.isArray(message) ? message.join('; ') : message;

      let code: number = ErrorCodes.INTERNAL;
      if (status === HttpStatus.BAD_REQUEST) code = ErrorCodes.INVALID_PARAM;
      else if (status === HttpStatus.UNAUTHORIZED) code = ErrorCodes.UNAUTHORIZED;
      else if (status === HttpStatus.FORBIDDEN) code = ErrorCodes.FORBIDDEN;
      else if (status === HttpStatus.NOT_FOUND)
        code = ErrorCodes.NOT_FOUND_INGREDIENT;
      else if (status === HttpStatus.TOO_MANY_REQUESTS)
        code = ErrorCodes.RATE_LIMITED;

      return response.status(status).json({
        code,
        message: normalized,
        data: null,
      });
    }

    const message =
      exception instanceof Error ? exception.message : 'Internal error';
    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      code: ErrorCodes.INTERNAL,
      message,
      data: null,
    });
  }
}
