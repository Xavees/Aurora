
import {
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { DesativarUsuarioTransacionalRepository } from '../../domain/repositories/desativar-usuario-transacional.repository.js';

import { DESATIVAR_USUARIO_TRANSACIONAL_REPOSITORY } from '../../domain/repositories/desativar-usuario-transacional.repository.token.js';

@Injectable()
export class DesativarUsuarioUseCase {
  constructor(
    @Inject(DESATIVAR_USUARIO_TRANSACIONAL_REPOSITORY)
    private readonly desativarUsuarioRepository: DesativarUsuarioTransacionalRepository,
  ) {}

  async executar(id: string): Promise<void> {
    const desativado = await this.desativarUsuarioRepository.desativar(id);

    if (!desativado) {
      throw new NotFoundException(
        'Usuário ativo não encontrado.',
      );
    }
  }
}
