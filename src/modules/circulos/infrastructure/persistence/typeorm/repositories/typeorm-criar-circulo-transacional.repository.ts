
import { Injectable } from '@nestjs/common';
import { DataSource, QueryFailedError } from 'typeorm';

import type {
  CriarCirculoTransacionalDados,
  CriarCirculoTransacionalRepository,
  ResultadoCriacaoCirculo,
} from '../../../../domain/repositories/criar-circulo-transacional.repository.js';

import { CirculoOrmEntity } from '../entities/circulo.orm-entity.js';
import { MembroCirculoOrmEntity } from '../entities/membro-circulo.orm-entity.js';

@Injectable()
export class TypeOrmCriarCirculoTransacionalRepository
  implements CriarCirculoTransacionalRepository
{
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Cria o círculo e registra o criador como administrador.
   * Ambas as operações pertencem à mesma transação.
   */
  async criarComAdministrador(
    dados: CriarCirculoTransacionalDados,
  ): Promise<ResultadoCriacaoCirculo> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const circulo = manager.create(CirculoOrmEntity, {
          nome: dados.nome,
          codigoConvite: dados.codigoConvite,
        });

        const circuloSalvo = await manager.save(circulo);

        const membro = manager.create(MembroCirculoOrmEntity, {
          usuarioId: dados.criadorId,
          circuloId: circuloSalvo.id,
          funcao: 'ADMINISTRADOR',
        });

        await manager.save(membro);

        return {
          status: 'CIRCULO_CRIADO',
          circulo: {
            id: circuloSalvo.id,
            nome: circuloSalvo.nome,
            codigoConvite: circuloSalvo.codigoConvite,
            dataCriacao: circuloSalvo.dataCriacao,
          },
        };
      });
    } catch (error) {
      /**
       * MariaDB/MySQL: ER_DUP_ENTRY.
       *
       * Uma colisão de código pode ocorrer mesmo após
       * uma consulta prévia de disponibilidade.
       */
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string }).code ===
          'ER_DUP_ENTRY'
      ) {
        // Confirma que o erro corresponde ao código de convite.
        // withDeleted inclui círculos desativados.
        const codigoExistente = await this.dataSource
          .getRepository(CirculoOrmEntity)
          .createQueryBuilder('circulo')
          .withDeleted()
          .where('circulo.codigoConvite = :codigoConvite', {
            codigoConvite: dados.codigoConvite,
          })
          .getOne();

        if (codigoExistente) {
          return { status: 'CODIGO_CONVITE_DUPLICADO' };
        }
      }

      // Erros não relacionados à colisão são propagados.
      throw error;
    }
  }
}
