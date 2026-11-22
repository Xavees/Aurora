
import { Injectable } from '@nestjs/common';
import { DataSource, QueryFailedError } from 'typeorm';

import type {
  CriarCirculoTransacionalDados,
  CriarCirculoTransacionalRepository,
  ResultadoCriacaoCirculo,
} from '../../../../domain/repositories/criar-circulo-transacional.repository.js';

import { CirculoOrmEntity } from '../entities/circulo.orm-entity.js';
import { MembroCirculoOrmEntity } from '../entities/membro-circulo.orm-entity.js';

import { UsuarioOrmEntity } from '../../../../../usuarios/infrastructure/persistence/typeorm/entities/usuario.orm-entity.js';

@Injectable()
export class TypeOrmCriarCirculoTransacionalRepository
  implements CriarCirculoTransacionalRepository
{
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Cria o círculo e registra o criador como administrador.
   *
   * O bloqueio transacional da conta impede que sua
   * desativação seja concluída simultaneamente à criação.
   */
  async criarComAdministrador(
    dados: CriarCirculoTransacionalDados,
  ): Promise<ResultadoCriacaoCirculo> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        /**
         * Bloqueia o criador antes de criar qualquer registro.
         *
         * A futura desativação coordenada deverá utilizar
         * um protocolo compatível com este bloqueio.
         */
        const criador = await manager
          .getRepository(UsuarioOrmEntity)
          .createQueryBuilder('usuario')
          .setLock('pessimistic_write')
          .where('usuario.id = :criadorId', {
            criadorId: dados.criadorId,
          })
          .andWhere('usuario.excluidoEm IS NULL')
          .getOne();

        if (!criador) {
          return { status: 'CRIADOR_INATIVO' };
        }

        // Cria o círculo dentro da mesma transação.
        const circulo = manager.create(CirculoOrmEntity, {
          nome: dados.nome,
          codigoConvite: dados.codigoConvite,
        });

        const circuloSalvo = await manager.save(circulo);

        // Registra o criador como primeiro administrador.
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
       * A restrição UNIQUE continua protegendo contra
       * códigos de convite duplicados.
       */
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string }).code ===
          'ER_DUP_ENTRY'
      ) {
        /**
         * Confirma que a colisão corresponde ao código.
         * withDeleted inclui círculos desativados.
         */
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

      // Erros não relacionados ao convite são propagados.
      throw error;
    }
  }
}
