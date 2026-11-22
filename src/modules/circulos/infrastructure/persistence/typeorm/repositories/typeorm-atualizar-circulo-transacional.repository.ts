
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import type {
  AtualizarCirculoTransacionalRepository,
  AtualizarCirculoTransacionalDados,
  ResultadoAtualizacaoCirculo,
} from '../../../../domain/repositories/atualizar-circulo-transacional.repository.js';

import type { Circulo } from '../../../../domain/entities/circulo.entity.js';

import { CirculoOrmEntity } from '../entities/circulo.orm-entity.js';
import { MembroCirculoOrmEntity } from '../entities/membro-circulo.orm-entity.js';
import { UsuarioOrmEntity } from '../../../../../usuarios/infrastructure/persistence/typeorm/entities/usuario.orm-entity.js';

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
      // Bloqueia a conta e confirma que o administrador está ativo.
      const usuario = await manager
        .getRepository(UsuarioOrmEntity)
        .createQueryBuilder('usuario')
        .setLock('pessimistic_write')
        .where('usuario.id = :usuarioId', { usuarioId })
        .andWhere('usuario.excluidoEm IS NULL')
        .getOne();

      if (!usuario) {
        return { status: 'USUARIO_NAO_AUTORIZADO' };
      }

      // Bloqueia o círculo durante a atualização.
      const circulo = await manager
        .getRepository(CirculoOrmEntity)
        .createQueryBuilder('circulo')
        .setLock('pessimistic_write')
        .where('circulo.id = :circuloId', { circuloId })
        .getOne();

      if (!circulo) {
        return { status: 'CIRCULO_NAO_ENCONTRADO' };
      }

      const membro = await manager
        .getRepository(MembroCirculoOrmEntity)
        .findOne({
          where: { circuloId, usuarioId },
        });

      if (!membro || membro.funcao !== 'ADMINISTRADOR') {
        return { status: 'USUARIO_NAO_AUTORIZADO' };
      }

      circulo.nome = dados.nome;

      const circuloAtualizado = await manager
        .getRepository(CirculoOrmEntity)
        .save(circulo);

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
