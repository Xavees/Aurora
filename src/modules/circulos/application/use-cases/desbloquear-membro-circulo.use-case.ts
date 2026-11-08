import { ForbiddenException,Inject,Injectable, NotFoundException,} from '@nestjs/common';

import type { DesbloquearMembroTransacionalRepository } from '../../domain/repositories/desbloquear-membro-transacional.repository.js';

import { DESBLOQUEAR_MEMBRO_TRANSACIONAL_REPOSITORY } from '../../domain/repositories/desbloquear-membro-transacional.repository.token.js';

@Injectable()
export class DesbloquearMembroCirculoUseCase {
  constructor(
    @Inject(DESBLOQUEAR_MEMBRO_TRANSACIONAL_REPOSITORY)
    private readonly desbloquearMembroRepository: DesbloquearMembroTransacionalRepository,
  ) {}

  /**
   * Permite que um administrador desbloqueie
   * um usuário anteriormente removido do círculo.
   *
   * A autorização e a exclusão do bloqueio
   * são realizadas na mesma transação.
   */
  async executar(
    circuloId: string,
    solicitanteId: string,
    usuarioAlvoId: string,
  ): Promise<void> {
    const resultado = await this.desbloquearMembroRepository.desbloquear(
      circuloId,
      solicitanteId,
      usuarioAlvoId,
    );

    switch (resultado) {
      case 'CIRCULO_NAO_ENCONTRADO':
        throw new NotFoundException(
          'Círculo não encontrado.',
        );

      case 'SOLICITANTE_NAO_E_ADMINISTRADOR':
        throw new ForbiddenException(
          'Apenas administradores podem desbloquear participantes.',
        );

      case 'BLOQUEIO_NAO_ENCONTRADO':
        throw new NotFoundException(
          'Nenhum bloqueio encontrado para este usuário neste círculo.',
        );

      case 'MEMBRO_DESBLOQUEADO':
        return;
    }
  }
}
