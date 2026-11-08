
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import type { ResultadoSaidaCirculo, SairCirculoTransacionalRepository,} from '../../../../domain/repositories/sair-circulo-transacional.repository.js';

import { CirculoOrmEntity } from '../entities/circulo.orm-entity.js';
import { MembroCirculoOrmEntity } from '../entities/membro-circulo.orm-entity.js';

@Injectable()
export class TypeOrmSairCirculoTransacionalRepository
  implements SairCirculoTransacionalRepository
{
  constructor(private readonly dataSource: DataSource) {}

  async sair(
    circuloId: string,
    usuarioId: string,
  ): Promise<ResultadoSaidaCirculo> {
    return this.dataSource.transaction(async (manager) => {
      /*
       * Bloqueamos o círculo para serializar as operações
       * de saída que utilizarem este mesmo protocolo.
       */
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

      const membroAtual = await membroRepository.findOne({
        where: {
          circuloId,
          usuarioId,
        },
      });

      if (!membroAtual) {
        return 'USUARIO_NAO_PARTICIPA';
      }

      // Ordem determinística para escolher um sucessor.
      const membros = await membroRepository.find({
        where: { circuloId },
        order: {
          dataEntrada: 'ASC',
          id: 'ASC',
        },
      });

      // Se existe apenas um participante, desativamos o círculo.
      if (membros.length === 1) {
        await membroRepository.remove(membroAtual);

        await manager.getRepository(CirculoOrmEntity).softDelete(
          circuloId,
        );

        return 'CIRCULO_DESATIVADO';
      }

      if (membroAtual.funcao === 'ADMINISTRADOR') {
        const outrosMembros = membros.filter(
          (membro) => membro.id !== membroAtual.id,
        );

        const existeOutroAdministrador = outrosMembros.some(
          (membro) => membro.funcao === 'ADMINISTRADOR',
        );

        if (!existeOutroAdministrador) {
          const sucessor = outrosMembros[0];

          sucessor.funcao = 'ADMINISTRADOR';
          await membroRepository.save(sucessor);

          await membroRepository.remove(membroAtual);

          return 'ADMINISTRADOR_TRANSFERIDO';
        }
      }

      await membroRepository.remove(membroAtual);

      return 'MEMBRO_REMOVIDO';
    });
  }
}
