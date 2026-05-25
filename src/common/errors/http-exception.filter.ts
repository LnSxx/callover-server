import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiErrorCode } from './api-error-code';

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

    const bodyParserStatusCode = this.getBodyParserStatusCode(exception);

    const isHttpException = exception instanceof HttpException;

    const statusCode =
      bodyParserStatusCode ??
      (isHttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR);

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
      case HttpStatus.PAYLOAD_TOO_LARGE:
        return ApiErrorCode.PAYLOAD_TOO_LARGE;
      case HttpStatus.TOO_MANY_REQUESTS:
        return ApiErrorCode.TOO_MANY_REQUESTS;
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
      case HttpStatus.PAYLOAD_TOO_LARGE:
        return 'Request body is too large';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'Too many requests';
      default:
        return 'Internal server error';
    }
  }

  private getBodyParserStatusCode(exception: unknown): HttpStatus | null {
    if (!exception || typeof exception !== 'object') {
      return null;
    }

    const error = exception as {
      type?: string;
      status?: number;
      statusCode?: number;
    };

    if (
      error.type === 'entity.too.large' ||
      error.status === HttpStatus.PAYLOAD_TOO_LARGE ||
      error.statusCode === HttpStatus.PAYLOAD_TOO_LARGE
    ) {
      return HttpStatus.PAYLOAD_TOO_LARGE;
    }

    if (
      error.type === 'entity.parse.failed' ||
      error.status === HttpStatus.BAD_REQUEST ||
      error.statusCode === HttpStatus.BAD_REQUEST
    ) {
      return HttpStatus.BAD_REQUEST;
    }

    return null;
  }
}
