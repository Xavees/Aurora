
import { Inject, Injectable } from '@nestjs/common';

import { AREA_RISCO_REPOSITORY } from '../../domain/repositories/area-risco.repository.token.js';

import type {
  AreaRiscoRepository,
  FiltrosAreaRisco,
  ResultadoAreasRisco,
} from '../../domain/repositories/area-risco.repository.js';

/**
 * Caso de uso responsável pela listagem de áreas de risco.
 *
 * Depende do contrato do repositório, não da implementação
 * concreta que utiliza TypeORM.
 */
@Injectable()
export class ListarAreasRiscoUseCase {
  constructor(
    @Inject(AREA_RISCO_REPOSITORY)
    private readonly areaRiscoRepository: AreaRiscoRepository,
  ) {}

  /**
   * Executa a consulta utilizando os filtros recebidos.
   *
   * A validação dos parâmetros HTTP ficará nos DTOs.
   * A consulta ao banco ficará no repositório.
   */
  async executar(
    filtros: FiltrosAreaRisco,
  ): Promise<ResultadoAreasRisco> {
    return this.areaRiscoRepository.listar(filtros);
  }
}
