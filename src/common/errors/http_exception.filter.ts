import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiErrorCode } from './api_error_code';

type ErrorResponse = {
  statusCode: number;
  code: string;
  message: string;
  path: string;
  timestamp: string;
  errors?: unknown;
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;

    const statusCode = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = isHttpException ? exception.getResponse() : null;

    const body = this.buildResponse({
      statusCode,
      exceptionResponse,
      path: request.url,
    });

    response.status(statusCode).json(body);
  }

  private buildResponse(params: {
    statusCode: number;
    exceptionResponse: string | object | null;
    path: string;
  }): ErrorResponse {
    const { statusCode, exceptionResponse, path } = params;

    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const response = exceptionResponse as Record<string, unknown>;

      const responseMessage =
        response.message && typeof response.message === 'string'
          ? response.message
          : this.getDefaultMessage(statusCode);

      const responseCode =
        response.code && typeof response.code === 'string'
          ? response.code
          : this.getDefaultCode(statusCode);

      return {
        statusCode,
        code: responseCode,
        message: responseMessage,
        path,
        timestamp: new Date().toISOString(),
        ...(response.errors ? { errors: response.errors } : {}),
      };
    }

    return {
      statusCode,
      code: this.getDefaultCode(statusCode),
      message:
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : this.getDefaultMessage(statusCode),
      path,
      timestamp: new Date().toISOString(),
    };
  }

  private getDefaultCode(statusCode: HttpStatus): ApiErrorCode | string {
    switch (statusCode) {
      case HttpStatus.BAD_REQUEST:
        return ApiErrorCode.VALIDATION_ERROR;
      case HttpStatus.UNAUTHORIZED:
        return ApiErrorCode.AUTHENTICATION_REQUIRED;
      case HttpStatus.INTERNAL_SERVER_ERROR:
        return ApiErrorCode.INTERNAL_SERVER_ERROR;
      case HttpStatus.CONFLICT:
        return ApiErrorCode.CONFLICT;
      default:
        return `HTTP_${statusCode}`;
    }
  }

  private getDefaultMessage(statusCode: HttpStatus): string {
    switch (statusCode) {
      case HttpStatus.BAD_REQUEST:
        return 'Bad request';
      case HttpStatus.UNAUTHORIZED:
        return 'Unauthorized';
      case HttpStatus.FORBIDDEN:
        return 'Forbidden';
      case HttpStatus.NOT_FOUND:
        return 'Not found';
      case HttpStatus.CONFLICT:
        return 'Conflict';
      default:
        return 'Internal server error';
    }
  }
}
