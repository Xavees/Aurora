import {
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';

import type { RequestAutenticada } from '../../../infrastructure/security/guards/jwt-auth.guard.js';

export const UsuarioAtual = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const request =
      context.switchToHttp().getRequest<RequestAutenticada>();

    return request.usuario;
  },
);