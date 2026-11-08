
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import type {
  DesbloquearMembroTransacionalRepository,
  ResultadoDesbloqueioMembro,
} from '../../../../domain/repositories/desbloquear-membro-transacional.repository.js';

import { CirculoOrmEntity } from '../entities/circulo.orm-entity.js';
import { MembroCirculoOrmEntity } from '../entities/membro-circulo.orm-entity.js';
import { BloqueioCirculoOrmEntity } from '../entities/bloqueio-circulo.orm-entity.js';

@Injectable()
export class TypeOrmDesbloquearMembroTransacionalRepository
  implements DesbloquearMembroTransacionalRepository
{
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Remove o bloqueio administrativo de um usuário.
   *
   * A autorização e a exclusão do bloqueio são realizadas
   * dentro da mesma transação.
   */
  async desbloquear(
    circuloId: string,
    solicitanteId: string,
    usuarioAlvoId: string,
  ): Promise<ResultadoDesbloqueioMembro> {
    return this.dataSource.transaction(async (manager) => {
      // Bloqueia o círculo antes de consultar seus participantes.
      const circulo = await manager
        .getRepository(CirculoOrmEntity)
        .createQueryBuilder('circulo')
        .setLock('pessimistic_write')
        .where('circulo.id = :circuloId', { circuloId })
        .getOne();

      if (!circulo) {
        return 'CIRCULO_NAO_ENCONTRADO';
      }

      const membroRepository = manager.getRepository(
        MembroCirculoOrmEntity,
      );

      // Somente administradores podem desbloquear usuários.
      const solicitante = await membroRepository.findOne({
        where: {
          circuloId,
          usuarioId: solicitanteId,
        },
      });

      if (
        !solicitante ||
        solicitante.funcao !== 'ADMINISTRADOR'
      ) {
        return 'SOLICITANTE_NAO_E_ADMINISTRADOR';
      }

      const bloqueioRepository = manager.getRepository(
        BloqueioCirculoOrmEntity,
      );

      // Verifica se o usuário realmente está bloqueado.
      const bloqueio = await bloqueioRepository.findOne({
        where: {
          circuloId,
          usuarioId: usuarioAlvoId,
        },
      });

      if (!bloqueio) {
        return 'BLOQUEIO_NAO_ENCONTRADO';
      }

      // Remove o bloqueio dentro da transação.
      await bloqueioRepository.remove(bloqueio);

      return 'MEMBRO_DESBLOQUEADO';
    });
  }
}
