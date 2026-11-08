
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type {  RemoverCirculoTransacionalRepository,ResultadoRemocaoCirculo,} from '../../../../domain/repositories/remover-circulo-transacional.repository.js';

import { CirculoOrmEntity } from '../entities/circulo.orm-entity.js';
import { MembroCirculoOrmEntity } from '../entities/membro-circulo.orm-entity.js';

@Injectable()
export class TypeOrmRemoverCirculoTransacionalRepository
  implements RemoverCirculoTransacionalRepository
{
  constructor(private readonly dataSource: DataSource) {}

  async remover(
    circuloId: string,
    usuarioId: string,
  ): Promise<ResultadoRemocaoCirculo> {
    return this.dataSource.transaction(async (manager) => {
      /**
       * Bloqueia o círculo durante a operação.
       *
       * Outras transações que utilizarem o mesmo
       * bloqueio precisarão aguardar sua liberação.
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

      /**
       * Verifica a permissão dentro da transação,
       * após obter o bloqueio do círculo.
       */
      const membro = await manager
        .getRepository(MembroCirculoOrmEntity)
        .findOne({
          where: {
            circuloId,
            usuarioId,
          },
        });

      if (!membro || membro.funcao !== 'ADMINISTRADOR') {
        return 'USUARIO_NAO_AUTORIZADO';
      }

      /**
       * Executa o soft delete utilizando o mesmo
       * gerenciador da transação.
       */
      const resultado = await manager
        .getRepository(CirculoOrmEntity)
        .createQueryBuilder()
        .softDelete()
        .where('id_circulo = :circuloId', { circuloId })
        .andWhere('deleted_at IS NULL')
        .execute();

      if ((resultado.affected ?? 0) === 0) {
        return 'CIRCULO_NAO_ENCONTRADO';
      }

      return 'CIRCULO_REMOVIDO';
    });
  }
}
