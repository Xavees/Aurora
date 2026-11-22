
import { Injectable } from '@nestjs/common';
import { DataSource, QueryFailedError } from 'typeorm';

import type {
  EntrarCirculoTransacionalRepository,
  ResultadoEntradaCirculo,
} from '../../../../domain/repositories/entrar-circulo-transacional.repository.js';

import type { MembroCirculo } from '../../../../domain/entities/membro-circulo.entity.js';

import { CirculoOrmEntity } from '../entities/circulo.orm-entity.js';
import { MembroCirculoOrmEntity } from '../entities/membro-circulo.orm-entity.js';
import { BloqueioCirculoOrmEntity } from '../entities/bloqueio-circulo.orm-entity.js';

import { UsuarioOrmEntity } from '../../../../../usuarios/infrastructure/persistence/typeorm/entities/usuario.orm-entity.js';

@Injectable()
export class TypeOrmEntrarCirculoTransacionalRepository
  implements EntrarCirculoTransacionalRepository
{
  constructor(private readonly dataSource: DataSource) {}

  async entrar(
    codigoConvite: string,
    usuarioId: string,
  ): Promise<ResultadoEntradaCirculo> {
    return this.dataSource.transaction(async (manager) => {
      /**
       * 1. Bloqueia o usuário antes de modificar
       * suas participações.
       *
       * Esse bloqueio deverá ser utilizado também
       * pela desativação coordenada de contas.
       */
      const usuario = await manager
        .getRepository(UsuarioOrmEntity)
        .createQueryBuilder('usuario')
        .setLock('pessimistic_write')
        .where('usuario.id = :usuarioId', { usuarioId })
        .andWhere('usuario.excluidoEm IS NULL')
        .getOne();

      if (!usuario) {
        return { status: 'USUARIO_INATIVO' };
      }

      /**
       * 2. Bloqueia o círculo para serializar
       * entradas e demais alterações de membros.
       *
       * As outras operações ainda precisarão
       * ser compatibilizadas com este protocolo.
       */
      const circulo = await manager
        .getRepository(CirculoOrmEntity)
        .createQueryBuilder('circulo')
        .setLock('pessimistic_write')
        .where('circulo.codigoConvite = :codigoConvite', {
          codigoConvite,
        })
        .getOne();

      if (!circulo) {
        return { status: 'CIRCULO_NAO_ENCONTRADO' };
      }

      /**
       * 3. Verifica se o usuário foi removido
       * administrativamente deste círculo.
       */
      const bloqueioRepository = manager.getRepository(
        BloqueioCirculoOrmEntity,
      );

      const bloqueioExistente = await bloqueioRepository.findOne({
        where: {
          circuloId: circulo.id,
          usuarioId,
        },
      });

      if (bloqueioExistente) {
        return { status: 'USUARIO_BLOQUEADO' };
      }

      const membroRepository = manager.getRepository(
        MembroCirculoOrmEntity,
      );

      /**
       * 4. Impede uma segunda participação
       * do mesmo usuário no mesmo círculo.
       */
      const membroExistente = await membroRepository.findOne({
        where: {
          circuloId: circulo.id,
          usuarioId,
        },
      });

      if (membroExistente) {
        return { status: 'USUARIO_JA_PARTICIPA' };
      }

      /**
       * 5. Registra a participação dentro
       * da mesma transação.
       */
      const novoMembro = membroRepository.create({
        circuloId: circulo.id,
        usuarioId,
        funcao: 'MEMBRO',
      });

      try {
        const membroSalvo = await membroRepository.save(novoMembro);

        const membro: MembroCirculo = {
          id: membroSalvo.id,
          usuarioId: membroSalvo.usuarioId,
          circuloId: membroSalvo.circuloId,
          funcao: membroSalvo.funcao,
          dataEntrada: membroSalvo.dataEntrada,
        };

        return {
          status: 'MEMBRO_ADICIONADO',
          membro,
        };
      } catch (error) {
        /**
         * A restrição UNIQUE do MariaDB continua
         * sendo a proteção definitiva contra
         * participações duplicadas.
         */
        if (
          error instanceof QueryFailedError &&
          (error.driverError as { code?: string }).code ===
            'ER_DUP_ENTRY'
        ) {
          return { status: 'USUARIO_JA_PARTICIPA' };
        }

        throw error;
      }
    });
  }
}
