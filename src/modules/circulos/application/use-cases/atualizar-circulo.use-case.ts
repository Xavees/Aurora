
import {ForbiddenException, Inject, Injectable,NotFoundException,} from '@nestjs/common';

import type { Circulo } from '../../domain/entities/circulo.entity.js';

import type { AtualizarCirculoTransacionalRepository } from '../../domain/repositories/atualizar-circulo-transacional.repository.js';

import { ATUALIZAR_CIRCULO_TRANSACIONAL_REPOSITORY } from '../../domain/repositories/atualizar-circulo-transacional.repository.token.js';

export interface AtualizarCirculoInput {
  nome: string;
}

@Injectable()
export class AtualizarCirculoUseCase {
  constructor(
    @Inject(ATUALIZAR_CIRCULO_TRANSACIONAL_REPOSITORY)
    private readonly atualizarCirculoRepository: AtualizarCirculoTransacionalRepository,
  ) {}

  /**
   * Atualiza o nome de um círculo.
   *
   * A verificação da permissão administrativa
   * e a atualização são executadas na mesma transação.
   */
  async executar(
    circuloId: string,
    usuarioId: string,
    dados: AtualizarCirculoInput,
  ): Promise<Circulo> {
    const resultado = await this.atualizarCirculoRepository.atualizar(
      circuloId,
      usuarioId,
      { nome: dados.nome },
    );

    switch (resultado.status) {
      case 'CIRCULO_NAO_ENCONTRADO':
        throw new NotFoundException(
          'Círculo não encontrado.',
        );

      case 'USUARIO_NAO_AUTORIZADO':
        throw new ForbiddenException(
          'Apenas administradores podem atualizar este círculo.',
        );

      case 'CIRCULO_ATUALIZADO':
        return resultado.circulo;
    }
  }
}
