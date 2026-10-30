import {
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { UsuarioRepository } from '../../domain/repositories/usuario.repository.js';

import { USUARIO_REPOSITORY } from '../../domain/repositories/usuario.repository.token.js';

@Injectable()
export class DesativarUsuarioUseCase {
  constructor(
    @Inject(USUARIO_REPOSITORY)
    private readonly usuarioRepository: UsuarioRepository,
  ) {}

  async executar(id: string): Promise<void> {
    /**
     * O caso de uso não conhece TypeORM ou SQL.
     * Ele utiliza somente o contrato do repositório.
     */
    const desativado = await this.usuarioRepository.desativar(id);

    if (!desativado) {
      throw new NotFoundException(
        'Usuário ativo não encontrado.',
      );
    }
  }
}