import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';

import type { Request } from 'express';

import type { UsuarioAutenticado } from '../../../domain/entitites/usuario-autenticado.entity.js';

import type { UsuarioRepository } from '../../../../usuarios/domain/repositories/usuario.repository.js';

import { USUARIO_REPOSITORY } from '../../../../usuarios/domain/repositories/usuario.repository.token.js';

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

    /**
     * O Guard depende do contrato do repositório,
     * e não diretamente do TypeORM.
     *
     * Isso mantém nossa arquitetura desacoplada.
     */
    @Inject(USUARIO_REPOSITORY)
    private readonly usuarioRepository: UsuarioRepository,
  ) {}

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const request =
      context.switchToHttp().getRequest<RequestAutenticada>();

    const authorization = request.headers.authorization;

    /**
     * Aceitamos apenas:
     *
     * Authorization: Bearer <token>
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

    let payload: JwtPayload;

    try {
      /**
       * Primeiro validamos o JWT:
       * assinatura, expiração, algoritmo,
       * emissor e audiência.
       */
      payload = await this.jwtService.verifyAsync<JwtPayload>(
        token,
        {
          algorithms: ['HS256'],
          issuer: 'aurora-api',
          audience: 'aurora-app',
        },
      );
    } catch {
      throw new UnauthorizedException(
        'Token de autenticação inválido ou expirado.',
      );
    }

    /**
     * Validamos os campos obrigatórios
     * do token antes de consultar o banco.
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

    /**
     * NOVA VERIFICAÇÃO — SOFT DELETE
     *
     * O TypeORM ignora automaticamente registros
     * com excluido_em preenchido nas consultas
     * normais do Repository.
     */
    const usuario = await this.usuarioRepository.buscarPorId(
      payload.sub,
    );

    if (!usuario) {
      throw new UnauthorizedException(
        'Conta inexistente ou desativada.',
      );
    }

    /**
     * Só agora consideramos o usuário autenticado.
     *
     * Usamos o e-mail atual do banco, pois ele
     * pode ter sido alterado depois da emissão do JWT.
     */
    request.usuario = {
      id: usuario.id,
      email: usuario.email,
    };

    return true;
  }
}