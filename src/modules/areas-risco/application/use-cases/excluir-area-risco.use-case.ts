
import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { AREA_RISCO_REPOSITORY } from '../../domain/repositories/area-risco.repository.token.js';

import type { AreaRiscoRepository } from '../../domain/repositories/area-risco.repository.js';

/**
 * Dados necessários para excluir logicamente uma área.
 *
 * usuarioId deve vir do JWT autenticado,
 * nunca de um parâmetro enviado no body.
 */
export interface ExcluirAreaRiscoInput {
  id: string;
  usuarioId: string;
}

/**
 * Caso de uso responsável pela exclusão lógica
 * de áreas de risco colaborativas.
 *
 * O registro permanece no banco de dados.
 */
@Injectable()
export class ExcluirAreaRiscoUseCase {
  constructor(
    @Inject(AREA_RISCO_REPOSITORY)
    private readonly areaRiscoRepository: AreaRiscoRepository,
  ) {}

  async executar(input: ExcluirAreaRiscoInput): Promise<void> {
    const { id, usuarioId } = input;

    /**
     * A busca interna permite encontrar áreas pendentes
     * ou rejeitadas, desde que não estejam excluídas.
     */
    const area = await this.areaRiscoRepository.buscarPorIdParaEdicao(id);

    if (!area) {
      throw new NotFoundException('Área de risco não encontrada.');
    }

    // Áreas oficiais não podem ser excluídas por este fluxo.
    if (area.tipoOrigem !== 'COLABORATIVA') {
      throw new ForbiddenException(
        'Esta área não permite exclusão colaborativa.',
      );
    }

    // Somente o autor pode excluir sua própria área.
    if (area.usuarioId !== usuarioId) {
      throw new ForbiddenException(
        'Você não tem permissão para excluir esta área.',
      );
    }

    /**
     * O repositório verifica novamente a autoria
     * e o estado da área dentro da transação.
     */
    const excluida = await this.areaRiscoRepository.excluir(
      id,
      usuarioId,
    );

    if (!excluida) {
      throw new NotFoundException(
        'Área de risco não está mais disponível para exclusão.',
      );
    }

    // O retorno void permitirá ao controller responder HTTP 204.
  }
}
