
import { Inject, Injectable } from '@nestjs/common';

import { AREA_RISCO_REPOSITORY } from '../../domain/repositories/area-risco.repository.token.js';

import type {
  AreaRisco,
  DadosCriacaoAreaRisco,
} from '../../domain/entities/area-risco.entity.js';

import type { AreaRiscoRepository } from '../../domain/repositories/area-risco.repository.js';

/**
 * Caso de uso responsável pelo cadastro
 * de novas áreas de risco colaborativas.
 *
 * A persistência define automaticamente:
 * - Origem: COLABORATIVA
 * - Status: PENDENTE
 *
 * Assim, uma área recém-criada não aparece
 * imediatamente nas consultas públicas.
 */
@Injectable()
export class CriarAreaRiscoUseCase {
  constructor(
    @Inject(AREA_RISCO_REPOSITORY)
    private readonly areaRiscoRepository: AreaRiscoRepository,
  ) {}

  /**
   * Executa o cadastro de uma área de risco.
   *
   * Os dados recebidos devem ter sido validados
   * na camada de apresentação.
   *
   * O identificador do autor será obtido do JWT,
   * nunca diretamente do corpo da requisição.
   */
  async executar(
    dados: DadosCriacaoAreaRisco,
  ): Promise<AreaRisco> {
    return this.areaRiscoRepository.criar(dados);
  }
}
