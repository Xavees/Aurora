import {
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type {
  UsuarioRepository,
  AtualizarUsuarioData,
} from '../../domain/repositories/usuario.repository.js';

import { USUARIO_REPOSITORY } from '../../domain/repositories/usuario.repository.token.js';

import type { Usuario } from '../../domain/entities/usuario.entity.js';

@Injectable()
export class AtualizarUsuarioUseCase {
  constructor(
    @Inject(USUARIO_REPOSITORY)
    private readonly usuarioRepository: UsuarioRepository,
  ) {}

  async executar(
    id: string,
    dados: AtualizarUsuarioData,
  ): Promise<Usuario> {
    /**
     * O caso de uso coordena a operação.
     *
     * A persistência continua sendo responsabilidade
     * do repositório.
     */
    const usuario = await this.usuarioRepository.atualizar(
      id,
      dados,
    );

    if (!usuario) {
      throw new NotFoundException(
        'Usuário não encontrado.',
      );
    }

    return usuario;
  }
}