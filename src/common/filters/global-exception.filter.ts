import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';

import type { Request, Response } from 'express';

@Catch()
@Injectable()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    // O filtro é global, mas aqui estamos tratando apenas requisições HTTP.
    const context = host.switchToHttp();

    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    // Exceções conhecidas preservam seu status HTTP.
    // Erros inesperados retornam 500 sem expor detalhes internos.
    const isHttpException = exception instanceof HttpException;

    const statusCode = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = isHttpException
      ? exception.getResponse()
      : null;

    let message: string | string[] = 'Erro interno do servidor.';

    if (isHttpException) {
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null &&
        'message' in exceptionResponse
      ) {
        const value = exceptionResponse.message;

        if (
          typeof value === 'string' ||
          (Array.isArray(value) &&
            value.every((item) => typeof item === 'string'))
        ) {
          message = value;
        }
      }
    }

    if (!isHttpException) {
      // O erro completo fica apenas no log interno
      this.logger.error(
        'Erro inesperado durante a requisição.',
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(statusCode).json({
      statusCode,
      error: isHttpException
        ? HttpStatus[statusCode] ?? 'HTTP_ERROR'
        : 'INTERNAL_SERVER_ERROR',
      message,
      path: request.originalUrl,
      timestamp: new Date().toISOString(),
    });
  }
}