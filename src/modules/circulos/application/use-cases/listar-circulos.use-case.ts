
import { Inject, Injectable } from '@nestjs/common';

import type { Circulo } from '../../domain/entities/circulo.entity.js';

import type { CirculoRepository } from '../../domain/repositories/circulo.repository.js';

import { CIRCULO_REPOSITORY } from '../../domain/repositories/circulo.repository.token.js';

@Injectable()
export class ListarCirculosUseCase {
  constructor(
    @Inject(CIRCULO_REPOSITORY)
    private readonly circuloRepository: CirculoRepository,
  ) {}

  /**
   * Lista os círculos dos quais o usuário participa.
   * O ID do usuário será obtido do JWT pelo controller.
   */
  async executar(usuarioId: string): Promise<Circulo[]> {
    return this.circuloRepository.listarPorUsuario(usuarioId);
  }
}
