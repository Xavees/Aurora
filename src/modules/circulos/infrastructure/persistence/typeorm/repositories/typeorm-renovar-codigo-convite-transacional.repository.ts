
import { Injectable } from '@nestjs/common';
import { DataSource, QueryFailedError } from 'typeorm';

import type { RenovarCodigoConviteTransacionalRepository, ResultadoRenovacaoCodigoConvite,} from '../../../../domain/repositories/renovar-codigo-convite-transacional.repository.js';

import { CirculoOrmEntity } from '../entities/circulo.orm-entity.js';
import { MembroCirculoOrmEntity } from '../entities/membro-circulo.orm-entity.js';

@Injectable()
export class TypeOrmRenovarCodigoConviteTransacionalRepository
  implements RenovarCodigoConviteTransacionalRepository
{
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Renova o código de convite de um círculo.
   *
   * O bloqueio pessimista impede que operações que seguem
   * o mesmo protocolo modifiquem o círculo simultaneamente.
   */
  async renovar(
    circuloId: string,
    solicitanteId: string,
    novoCodigo: string,
  ): Promise<ResultadoRenovacaoCodigoConvite> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        // Bloqueia o círculo antes de verificar suas permissões.
        const circulo = await manager
          .getRepository(CirculoOrmEntity)
          .createQueryBuilder('circulo')
          .setLock('pessimistic_write')
          .where('circulo.id = :circuloId', { circuloId })
          .getOne();

        if (!circulo) {
          return { status: 'CIRCULO_NAO_ENCONTRADO' };
        }

        const membroRepository = manager.getRepository(
          MembroCirculoOrmEntity,
        );

        // Apenas administradores podem renovar o código.
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

        // Atualiza o código dentro da mesma transação.
        circulo.codigoConvite = novoCodigo;

        await manager.save(circulo);

        return {
          status: 'CODIGO_RENOVADO',
          codigoConvite: novoCodigo,
        };
      });
    } catch (error) {
      /**
       * Uma colisão pode ocorrer se outro círculo
       * já utiliza o código gerado.
       *
       * O banco rejeita a atualização pela restrição UNIQUE.
       */
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string }).code ===
          'ER_DUP_ENTRY'
      ) {
        // Inclui círculos desativados na verificação.
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

      // Não ocultamos erros desconhecidos.
      throw error;
    }
  }
}
