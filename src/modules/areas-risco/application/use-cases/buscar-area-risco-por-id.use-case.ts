
import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { AREA_RISCO_REPOSITORY } from '../../domain/repositories/area-risco.repository.token.js';

import type { AreaRisco } from '../../domain/entities/area-risco.entity.js';

import type { AreaRiscoRepository } from '../../domain/repositories/area-risco.repository.js';

/**
 * Caso de uso responsável por consultar uma área de risco
 * pelo seu identificador.
 */
@Injectable()
export class BuscarAreaRiscoPorIdUseCase {
  constructor(
    @Inject(AREA_RISCO_REPOSITORY)
    private readonly areaRiscoRepository: AreaRiscoRepository,
  ) {}

  async executar(id: string): Promise<AreaRisco> {
    const area = await this.areaRiscoRepository.buscarPorId(id);

    /**
     * Não retornamos null para o controller.
     * Caso a área não exista, interrompemos a operação
     * com uma exceção que o NestJS transforma em HTTP 404.
     */
    if (!area) {
      throw new NotFoundException('Área de risco não encontrada.');
    }

    return area;
  }
}
