
import { Injectable } from '@nestjs/common';
import { DataSource, QueryFailedError } from 'typeorm';

import type {
  RenovarCodigoConviteTransacionalRepository,
  ResultadoRenovacaoCodigoConvite,
} from '../../../../domain/repositories/renovar-codigo-convite-transacional.repository.js';

import { CirculoOrmEntity } from '../entities/circulo.orm-entity.js';
import { MembroCirculoOrmEntity } from '../entities/membro-circulo.orm-entity.js';

import { UsuarioOrmEntity } from '../../../../../usuarios/infrastructure/persistence/typeorm/entities/usuario.orm-entity.js';

@Injectable()
export class TypeOrmRenovarCodigoConviteTransacionalRepository
  implements RenovarCodigoConviteTransacionalRepository
{
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Renova o código de convite de um círculo.
   *
   * A conta do solicitante é bloqueada antes do círculo,
   * seguindo o protocolo adotado nas operações anteriores.
   */
  async renovar(
    circuloId: string,
    solicitanteId: string,
    novoCodigo: string,
  ): Promise<ResultadoRenovacaoCodigoConvite> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        /**
         * 1. Bloqueia e valida a conta do solicitante.
         *
         * Isso impede que a renovação seja confirmada
         * simultaneamente à desativação da mesma conta
         * sem coordenação transacional.
         */
        const usuario = await manager
          .getRepository(UsuarioOrmEntity)
          .createQueryBuilder('usuario')
          .setLock('pessimistic_write')
          .where('usuario.id = :solicitanteId', {
            solicitanteId,
          })
          .andWhere('usuario.excluidoEm IS NULL')
          .getOne();

        if (!usuario) {
          return { status: 'USUARIO_NAO_AUTORIZADO' };
        }

        /**
         * 2. Bloqueia o círculo.
         */
        const circulo = await manager
          .getRepository(CirculoOrmEntity)
          .createQueryBuilder('circulo')
          .setLock('pessimistic_write')
          .where('circulo.id = :circuloId', { circuloId })
          .getOne();

        if (!circulo) {
          return { status: 'CIRCULO_NAO_ENCONTRADO' };
        }

        /**
         * 3. Confirma a participação administrativa.
         */
        const membroRepository = manager.getRepository(
          MembroCirculoOrmEntity,
        );

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
          return { status: 'USUARIO_NAO_AUTORIZADO' };
        }

        // Não permite reutilizar o código atual.
        if (circulo.codigoConvite === novoCodigo) {
          return { status: 'CODIGO_CONVITE_DUPLICADO' };
        }

        /**
         * 4. Atualiza o código na mesma transação.
         */
        circulo.codigoConvite = novoCodigo;

        await manager.save(circulo);

        return {
          status: 'CODIGO_RENOVADO',
          codigoConvite: novoCodigo,
        };
      });
    } catch (error) {
      /**
       * A restrição UNIQUE do MariaDB protege contra
       * códigos de convite duplicados.
       */
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string }).code ===
          'ER_DUP_ENTRY'
      ) {
        const codigoExistente = await this.dataSource
          .getRepository(CirculoOrmEntity)
          .createQueryBuilder('circulo')
          .withDeleted()
          .where('circulo.codigoConvite = :novoCodigo', {
            novoCodigo,
          })
          .getOne();

        if (codigoExistente) {
          return { status: 'CODIGO_CONVITE_DUPLICADO' };
        }
      }

      throw error;
    }
  }
}
