import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { RemoverCirculoTransacionalRepository } from '../../domain/repositories/remover-circulo-transacional.repository.js';

import { REMOVER_CIRCULO_TRANSACIONAL_REPOSITORY } from '../../domain/repositories/remover-circulo-transacional.repository.token.js';

@Injectable()
export class RemoverCirculoUseCase {
  constructor(
    @Inject(REMOVER_CIRCULO_TRANSACIONAL_REPOSITORY)
    private readonly removerCirculoRepository: RemoverCirculoTransacionalRepository,
  ) {}

  /**
   * Desativa um círculo de segurança.
   *
   * A verificação da permissão administrativa
   * e o soft delete ocorrem na mesma transação.
   */
  async executar(
    circuloId: string,
    usuarioId: string,
  ): Promise<void> {
    const resultado = await this.removerCirculoRepository.remover(
      circuloId,
      usuarioId,
    );

    switch (resultado) {
      case 'CIRCULO_NAO_ENCONTRADO':
        throw new NotFoundException(
          'Círculo não encontrado.',
        );

      case 'USUARIO_NAO_AUTORIZADO':
        throw new ForbiddenException(
          'Apenas administradores podem remover este círculo.',
        );

      case 'CIRCULO_REMOVIDO':
        return;
    }
  }
}
