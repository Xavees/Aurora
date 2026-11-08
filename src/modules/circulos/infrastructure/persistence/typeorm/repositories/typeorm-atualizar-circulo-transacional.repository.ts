
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type {AtualizarCirculoTransacionalRepository, AtualizarCirculoTransacionalDados,  ResultadoAtualizacaoCirculo,} from '../../../../domain/repositories/atualizar-circulo-transacional.repository.js';

import type { Circulo } from '../../../../domain/entities/circulo.entity.js';

import { CirculoOrmEntity } from '../entities/circulo.orm-entity.js';
import { MembroCirculoOrmEntity } from '../entities/membro-circulo.orm-entity.js';

@Injectable()
export class TypeOrmAtualizarCirculoTransacionalRepository
  implements AtualizarCirculoTransacionalRepository
{
  constructor(private readonly dataSource: DataSource) {}

  async atualizar(
    circuloId: string,
    usuarioId: string,
    dados: AtualizarCirculoTransacionalDados,
  ): Promise<ResultadoAtualizacaoCirculo> {
    return this.dataSource.transaction(async (manager) => {
      /**
       * Bloqueia o círculo para impedir alterações
       * concorrentes que utilizem o mesmo protocolo.
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
       * Verifica se o usuário ainda possui permissão
       * administrativa dentro da transação.
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
        return { status: 'USUARIO_NAO_AUTORIZADO' };
      }

      // Atualiza somente os campos permitidos.
      circulo.nome = dados.nome;

      const circuloAtualizado = await manager
        .getRepository(CirculoOrmEntity)
        .save(circulo);

      /**
       * Converte a entidade ORM para o modelo
       * de domínio, sem expor detalhes do TypeORM.
       */
      const resultado: Circulo = {
        id: circuloAtualizado.id,
        nome: circuloAtualizado.nome,
        codigoConvite: circuloAtualizado.codigoConvite,
        dataCriacao: circuloAtualizado.dataCriacao,
      };

      return {
        status: 'CIRCULO_ATUALIZADO',
        circulo: resultado,
      };
    });
  }
}
