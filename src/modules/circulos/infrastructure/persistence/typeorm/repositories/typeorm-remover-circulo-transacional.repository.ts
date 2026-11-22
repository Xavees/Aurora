
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import type {
  RemoverCirculoTransacionalRepository,
  ResultadoRemocaoCirculo,
} from '../../../../domain/repositories/remover-circulo-transacional.repository.js';

import { CirculoOrmEntity } from '../entities/circulo.orm-entity.js';
import { MembroCirculoOrmEntity } from '../entities/membro-circulo.orm-entity.js';

import { UsuarioOrmEntity } from '../../../../../usuarios/infrastructure/persistence/typeorm/entities/usuario.orm-entity.js';

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
       * 1. Bloqueia a conta antes do círculo.
       *
       * A consulta com FOR UPDATE garante que a
       * desativação da mesma conta não possa
       * avançar simultaneamente sem aguardar.
       */
      const usuario = await manager
        .getRepository(UsuarioOrmEntity)
        .createQueryBuilder('usuario')
        .setLock('pessimistic_write')
        .where('usuario.id = :usuarioId', { usuarioId })
        .andWhere('usuario.excluidoEm IS NULL')
        .getOne();

      if (!usuario) {
        return 'USUARIO_NAO_AUTORIZADO';
      }

      /**
       * 2. Bloqueia o círculo.
       *
       * Isso serializa alterações concorrentes
       * que utilizarem o mesmo protocolo.
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
       * 3. Confirma que o usuário ainda participa
       * do círculo como administrador.
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
       * 4. Executa o soft delete na mesma transação.
       *
       * A condição deleted_at IS NULL impede
       * desativações repetidas.
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
