import { Inject, Injectable, NotFoundException,} from '@nestjs/common';

import type { MembroCirculo } from '../../domain/entities/membro-circulo.entity.js';

import type { CirculoRepository } from '../../domain/repositories/circulo.repository.js';
import { CIRCULO_REPOSITORY } from '../../domain/repositories/circulo.repository.token.js';

import type { MembroCirculoRepository } from '../../domain/repositories/membro-circulo.repository.js';
import { MEMBRO_CIRCULO_REPOSITORY } from '../../domain/repositories/membro-circulo.repository.token.js';

@Injectable()
export class ListarMembrosCirculoUseCase {
  constructor(
    @Inject(CIRCULO_REPOSITORY)
    private readonly circuloRepository: CirculoRepository,

    @Inject(MEMBRO_CIRCULO_REPOSITORY)
    private readonly membroRepository: MembroCirculoRepository,
  ) {}

  /**
   * Lista os participantes de um círculo ativo.
   * Apenas usuários que participam do círculo
   * podem consultar seus membros.
   */
  async executar(
    circuloId: string,
    usuarioId: string,
  ): Promise<MembroCirculo[]> {
    // Verifica se o círculo existe e está ativo.
    const circulo = await this.circuloRepository.buscarPorId(circuloId);

    if (!circulo) {
      throw new NotFoundException('Círculo não encontrado.');
    }

    // Verifica se o usuário autenticado participa do círculo.
    const membro = await this.membroRepository.buscarPorUsuarioECirculo(
      usuarioId,
      circuloId,
    );

    if (!membro) {
      // Retorna 404 para não revelar a existência
      // de círculos privados a usuários externos.
      throw new NotFoundException('Círculo não encontrado.');
    }

    return this.membroRepository.listarPorCirculo(circuloId);
  }
}
