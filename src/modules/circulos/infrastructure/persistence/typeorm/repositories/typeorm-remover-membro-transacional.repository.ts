
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import type {
  RemoverMembroTransacionalRepository,
  ResultadoRemocaoMembro,
} from '../../../../domain/repositories/remover-membro-transacional.repository.js';

import { CirculoOrmEntity } from '../entities/circulo.orm-entity.js';
import { MembroCirculoOrmEntity } from '../entities/membro-circulo.orm-entity.js';
import { BloqueioCirculoOrmEntity } from '../entities/bloqueio-circulo.orm-entity.js';

import { UsuarioOrmEntity } from '../../../../../usuarios/infrastructure/persistence/typeorm/entities/usuario.orm-entity.js';

@Injectable()
export class TypeOrmRemoverMembroTransacionalRepository
  implements RemoverMembroTransacionalRepository
{
  constructor(private readonly dataSource: DataSource) {}

  async remover(
    circuloId: string,
    solicitanteId: string,
    membroId: string,
  ): Promise<ResultadoRemocaoMembro> {
    return this.dataSource.transaction(async (manager) => {
      const usuarioRepository = manager.getRepository(UsuarioOrmEntity);

      /**
       * Bloqueia as contas em ordem numérica crescente.
       *
       * Como os IDs são BIGINT, usamos BigInt para evitar
       * comparações incorretas com números grandes.
       *
       * A ordem fixa diminui o risco de deadlocks entre
       * operações que precisam bloquear vários usuários.
       */
      const usuariosIds = [...new Set([solicitanteId, membroId])].sort(
        (a, b) => {
          const idA = BigInt(a);
          const idB = BigInt(b);

          if (idA < idB) return -1;
          if (idA > idB) return 1;

          return 0;
        },
      );

      for (const usuarioId of usuariosIds) {
        /**
         * withDeleted permite localizar também contas
         * desativadas, para que o alvo de uma remoção
         * continue podendo ser identificado.
         */
        await usuarioRepository
          .createQueryBuilder('usuario')
          .withDeleted()
          .setLock('pessimistic_write')
          .where('usuario.id = :usuarioId', { usuarioId })
          .getOne();
      }

      /**
       * Depois dos bloqueios, confirma que o solicitante
       * ainda possui uma conta ativa.
       */
      const solicitanteAtivo = await usuarioRepository.findOne({
        where: {
          id: solicitanteId,
        },
      });

      if (!solicitanteAtivo) {
        return 'SOLICITANTE_NAO_E_ADMINISTRADOR';
      }

      /**
       * Bloqueia o círculo após as contas.
       *
       * Esse bloqueio serializa alterações de membros
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

      const membroRepository = manager.getRepository(
        MembroCirculoOrmEntity,
      );

      // Apenas administradores podem remover participantes.
      const solicitante = await membroRepository.findOne({
        where: {
          circuloId,
          usuarioId: solicitanteId,
        },
      });

      if (!solicitante || solicitante.funcao !== 'ADMINISTRADOR') {
        return 'SOLICITANTE_NAO_E_ADMINISTRADOR';
      }

      // A saída voluntária possui um fluxo próprio.
      if (solicitanteId === membroId) {
        return 'AUTO_REMOCAO_NAO_PERMITIDA';
      }

      // membroId representa o ID do usuário a ser removido.
      const membroAlvo = await membroRepository.findOne({
        where: {
          circuloId,
          usuarioId: membroId,
        },
      });

      if (!membroAlvo) {
        return 'MEMBRO_NAO_ENCONTRADO';
      }

      
      if (membroAlvo.funcao === 'ADMINISTRADOR') {
        return 'REMOCAO_ADMINISTRADOR_NAO_PERMITIDA';
      }

      const bloqueioRepository = manager.getRepository(
        BloqueioCirculoOrmEntity,
      );

      const bloqueio = bloqueioRepository.create({
        circuloId,
        usuarioId: membroId,
        bloqueadoPorId: solicitanteId,
      });

      await bloqueioRepository.save(bloqueio);

      // Remove o participante do círculo.
      await membroRepository.remove(membroAlvo);

      return 'MEMBRO_REMOVIDO';
    });
  }
}
