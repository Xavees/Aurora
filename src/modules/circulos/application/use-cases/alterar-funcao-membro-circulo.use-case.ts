
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { FuncaoMembro } from '../../domain/entities/membro-circulo.entity.js';

import type { AlterarFuncaoMembroTransacionalRepository } from '../../domain/repositories/alterar-funcao-membro-transacional.repository.js';

import { ALTERAR_FUNCAO_MEMBRO_TRANSACIONAL_REPOSITORY } from '../../domain/repositories/alterar-funcao-membro-transacional.repository.token.js';

@Injectable()
export class AlterarFuncaoMembroCirculoUseCase {
  constructor(
    @Inject(ALTERAR_FUNCAO_MEMBRO_TRANSACIONAL_REPOSITORY)
    private readonly alterarFuncaoRepository: AlterarFuncaoMembroTransacionalRepository,
  ) {}

  async executar(
    circuloId: string,
    solicitanteId: string,
    usuarioAlvoId: string,
    novaFuncao: FuncaoMembro,
  ): Promise<void> {
    /*
     * O repository executa as verificações e a alteração
     * da função dentro de uma única transação.
     */
    const resultado = await this.alterarFuncaoRepository.alterarFuncao(
      circuloId,
      solicitanteId,
      usuarioAlvoId,
      novaFuncao,
    );

    switch (resultado) {
      case 'CIRCULO_NAO_ENCONTRADO':
        throw new NotFoundException('Círculo não encontrado.');

      case 'SOLICITANTE_NAO_E_ADMINISTRADOR':
        throw new ForbiddenException(
          'Você não possui permissão para alterar funções.',
        );

      case 'MEMBRO_NAO_ENCONTRADO':
        throw new NotFoundException(
          'Participante não encontrado neste círculo.',
        );

      case 'ULTIMO_ADMINISTRADOR':
        throw new ConflictException(
          'O último administrador não pode ser rebaixado.',
        );

      case 'FUNCAO_JA_ATRIBUIDA':
        throw new ConflictException(
          'O participante já possui essa função.',
        );

      case 'FUNCAO_ALTERADA':
        return;
    }
  }
}
