import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';

import type { Request } from 'express';
import type { UsuarioAutenticado } from '../../../domain/entitites/usuario-autenticado.entity.js';

interface JwtPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface RequestAutenticada extends Request {
  usuario?: UsuarioAutenticado;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const request =
      context.switchToHttp().getRequest<RequestAutenticada>();

    const authorization = request.headers.authorization;

    /**
     * Esperamos exatamente o formato:
     *
     * Authorization: Bearer <token>
     *
     * Não aceitamos tokens pela query string,
     * pois URLs podem acabar registradas em logs.
     */
    const partes = authorization?.split(' ');

    if (
      !partes ||
      partes.length !== 2 ||
      partes[0] !== 'Bearer' ||
      !partes[1]
    ) {
      throw new UnauthorizedException(
        'Token de autenticação ausente ou inválido.',
      );
    }

    const token = partes[1];

    try {
      /**
       * verifyAsync valida a assinatura e a expiração.
       *
       * Também exigimos o algoritmo, o emissor
       * e a audiência configurados no JwtModule.
       */
      const payload = await this.jwtService.verifyAsync<JwtPayload>(
        token,
        {
          algorithms: ['HS256'],
          issuer: 'aurora-api',
          audience: 'aurora-app',
        },
      );

      /**
       * Além da verificação criptográfica, validamos
       * os campos que nossa aplicação precisa.
       */
      if (
        typeof payload.sub !== 'string' ||
        !/^[0-9]+$/.test(payload.sub) ||
        typeof payload.email !== 'string' ||
        !payload.email
      ) {
        throw new UnauthorizedException(
          'Token de autenticação inválido.',
        );
      }

      request.usuario = {
        id: payload.sub,
        email: payload.email,
      };

      return true;
    } catch {
      /**
       * Não revelamos se o token está expirado,
       * adulterado ou possui assinatura inválida.
       */
      throw new UnauthorizedException(
        'Token de autenticação inválido ou expirado.',
      );
    }
  }
}