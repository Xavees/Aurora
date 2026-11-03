import {
  Injectable,
  Logger,
  NestMiddleware,
} from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestLoggerMiddleware.name);

  use(req: Request, _res: Response, next: NextFunction): void {
    // Registra apenas o método e a rota, evitando expor
    // tokens, senhas e informações do corpo da requisição.
    this.logger.log(`${req.method} ${req.path}`);

    // Libera a requisição para continuar pelo pipeline do NestJS.
    next();
  }
}