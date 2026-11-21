
import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { AREA_RISCO_REPOSITORY } from '../../domain/repositories/area-risco.repository.token.js';

import type { AreaRisco } from '../../domain/entities/area-risco.entity.js';

import type {
  AreaRiscoRepository,
  DadosAtualizacaoAreaRisco,
} from '../../domain/repositories/area-risco.repository.js';

/**
 * Dados necessários para atualizar uma área de risco.
 *
 * O usuarioId vem do JWT autenticado.
 * Os campos de atualização vêm do corpo da requisição.
 */
export interface AtualizarAreaRiscoInput {
  id: string;
  usuarioId: string;
  dados: DadosAtualizacaoAreaRisco;
}

/**
 * Caso de uso responsável pela atualização de
 * áreas de risco colaborativas.
 *
 * Regras:
 * - A área deve existir e não estar excluída.
 * - Apenas o autor pode realizar alterações.
 * - Áreas oficiais não podem ser editadas por este fluxo.
 * - Uma edição retorna a área para PENDENTE.
 */
@Injectable()
export class AtualizarAreaRiscoUseCase {
  constructor(
    @Inject(AREA_RISCO_REPOSITORY)
    private readonly areaRiscoRepository: AreaRiscoRepository,
  ) {}

  async executar(
    input: AtualizarAreaRiscoInput,
  ): Promise<AreaRisco> {
    const { id, usuarioId, dados } = input;

    /**
     * Diferentemente da consulta pública,
     * esta busca encontra áreas pendentes e rejeitadas.
     *
     * Precisamos disso porque o autor pode editar
     * uma área que ainda está aguardando moderação.
     */
    const area = await this.areaRiscoRepository
      .buscarPorIdParaEdicao(id);

    if (!area) {
      throw new NotFoundException(
        'Área de risco não encontrada.',
      );
    }

    /**
     * Apenas áreas colaborativas podem ser editadas
     * por meio deste caso de uso.
     */
    if (area.tipoOrigem !== 'COLABORATIVA') {
      throw new ForbiddenException(
        'Esta área de risco não permite edição colaborativa.',
      );
    }

    /**
     * Verifica se o usuário autenticado é o autor.
     *
     * O ID do usuário não deve vir do body.
     */
    if (area.usuarioId !== usuarioId) {
      throw new ForbiddenException(
        'Você não tem permissão para editar esta área.',
      );
    }

    /**
     * O repositório verifica novamente as condições
     * dentro de uma transação com bloqueio pessimista.
     *
     * Essa segunda verificação evita confiar apenas
     * na leitura realizada acima.
     */
    const atualizada = await this.areaRiscoRepository.atualizar(
      id,
      usuarioId,
      dados,
    );

    if (!atualizada) {
      /**
       * A área pode ter sido excluída ou alterada
       * entre a leitura inicial e a atualização.
       */
      throw new NotFoundException(
        'Área de risco não está mais disponível para atualização.',
      );
    }

    return atualizada;
  }
}
