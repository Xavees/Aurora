
import { Injectable } from '@nestjs/common';
import { DataSource, QueryFailedError } from 'typeorm';

import type {EntrarCirculoTransacionalRepository, ResultadoEntradaCirculo,} from '../../../../domain/repositories/entrar-circulo-transacional.repository.js';

import type { MembroCirculo } from '../../../../domain/entities/membro-circulo.entity.js';

import { CirculoOrmEntity } from '../entities/circulo.orm-entity.js';
import { MembroCirculoOrmEntity } from '../entities/membro-circulo.orm-entity.js';
import { BloqueioCirculoOrmEntity } from '../entities/bloqueio-circulo.orm-entity.js';

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
       * Bloqueia o círculo durante a entrada.
       *
       * Assim, a entrada e a saída de participantes
       * seguem o mesmo protocolo de bloqueio.
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
 * Verifica se o usuário foi removido administrativamente.
 *
 * Essa consulta acontece depois do bloqueio pessimista
 * do círculo e antes da inclusão do participante.
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

      // Impede a entrada duplicada do mesmo usuário.
      const membroExistente = await membroRepository.findOne({
        where: {
          circuloId: circulo.id,
          usuarioId,
        },
      });

      if (membroExistente) {
        return { status: 'USUARIO_JA_PARTICIPA' };
      }

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
         * MariaDB/MySQL: ER_DUP_ENTRY (1062).
         * A constraint UNIQUE impede participações duplicadas.
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
