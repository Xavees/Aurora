import {ForbiddenException,Inject,Injectable,NotFoundException,} from '@nestjs/common';
import type { Circulo } from '../../domain/entities/circulo.entity.js';
import type { CirculoRepository } from '../../domain/repositories/circulo.repository.js';
import type { MembroCirculoRepository } from '../../domain/repositories/membro-circulo.repository.js';
import { CIRCULO_REPOSITORY } from '../../domain/repositories/circulo.repository.token.js';
import { MEMBRO_CIRCULO_REPOSITORY } from '../../domain/repositories/membro-circulo.repository.token.js';

@Injectable()
export class BuscarCirculoUseCase {
  constructor(
    @Inject(CIRCULO_REPOSITORY)
    private readonly circuloRepository: CirculoRepository,

    @Inject(MEMBRO_CIRCULO_REPOSITORY)
    private readonly membroRepository: MembroCirculoRepository,
  ) {}

  /**
   * Busca um círculo e verifica se o usuário
   * autenticado possui permissão para consultá-lo.
   */
  async executar(
    circuloId: string,
    usuarioId: string,
  ): Promise<Circulo> {
    const circulo = await this.circuloRepository.buscarPorId(circuloId);

    if (!circulo) {
      throw new NotFoundException('Círculo não encontrado.');
    }

    // Verifica se o usuário participa do círculo.
    const membro = await this.membroRepository.buscarPorUsuarioECirculo(
      usuarioId,
      circuloId,
    );

    if (!membro) {
      throw new ForbiddenException(
        'Você não possui permissão para acessar este círculo.',
      );
    }

    return circulo;
  }
}
