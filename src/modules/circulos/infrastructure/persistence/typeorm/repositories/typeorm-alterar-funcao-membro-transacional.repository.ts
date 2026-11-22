
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import type { FuncaoMembro } from '../../../../domain/entities/membro-circulo.entity.js';
import type {
  AlterarFuncaoMembroTransacionalRepository,
  ResultadoAlteracaoFuncao,
} from '../../../../domain/repositories/alterar-funcao-membro-transacional.repository.js';

import { CirculoOrmEntity } from '../entities/circulo.orm-entity.js';
import { MembroCirculoOrmEntity } from '../entities/membro-circulo.orm-entity.js';

import { UsuarioOrmEntity } from '../../../../../usuarios/infrastructure/persistence/typeorm/entities/usuario.orm-entity.js';

@Injectable()
export class TypeOrmAlterarFuncaoMembroTransacionalRepository
  implements AlterarFuncaoMembroTransacionalRepository
{
  constructor(private readonly dataSource: DataSource) {}

  async alterarFuncao(
    circuloId: string,
    solicitanteId: string,
    usuarioAlvoId: string,
    novaFuncao: FuncaoMembro,
  ): Promise<ResultadoAlteracaoFuncao> {
    return this.dataSource.transaction(async (manager) => {
      const usuarioRepository = manager.getRepository(
        UsuarioOrmEntity,
      );

      /**
       * 1. Ordena os IDs para evitar que duas operações
       * bloqueiem as mesmas contas em ordens diferentes.
       *
       * Utilizamos BigInt porque os IDs são BIGINT
       * no banco de dados.
       */
      const usuariosIds = [
        ...new Set([solicitanteId, usuarioAlvoId]),
      ].sort((a, b) => {
        const idA = BigInt(a);
        const idB = BigInt(b);

        if (idA < idB) return -1;
        if (idA > idB) return 1;

        return 0;
      });

      const usuariosAtivos = new Set<string>();

      /**
       * 2. Bloqueia as contas envolvidas na operação.
       *
       * withDeleted permite identificar contas que
       * já passaram pelo soft delete.
       */
      for (const usuarioId of usuariosIds) {
        const usuario = await usuarioRepository
          .createQueryBuilder('usuario')
          .withDeleted()
          .setLock('pessimistic_write')
          .where('usuario.id = :usuarioId', { usuarioId })
          .getOne();

        if (usuario && !usuario.excluidoEm) {
          usuariosAtivos.add(usuarioId);
        }
      }

      /**
       * Um administrador desativado não pode executar
       * alterações nas funções dos participantes.
       *
       * Reutilizamos o status existente.
       */
      if (!usuariosAtivos.has(solicitanteId)) {
        return 'SOLICITANTE_NAO_E_ADMINISTRADOR';
      }

      /**
       * 3. Bloqueia o círculo depois das contas.
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

      /**
       * 4. Confirma que o solicitante continua sendo
       * administrador do círculo.
       */
      const solicitante = await membroRepository.findOne({
        where: {
          circuloId,
          usuarioId: solicitanteId,
        },
      });

      if (!solicitante || solicitante.funcao !== 'ADMINISTRADOR') {
        return 'SOLICITANTE_NAO_E_ADMINISTRADOR';
      }

      /**
       * 5. Localiza o membro cuja função será alterada.
       */
      const membroAlvo = await membroRepository.findOne({
        where: {
          circuloId,
          usuarioId: usuarioAlvoId,
        },
      });

      if (!membroAlvo || !usuariosAtivos.has(usuarioAlvoId)) {
        return 'MEMBRO_NAO_ENCONTRADO';
      }

      if (membroAlvo.funcao === novaFuncao) {
        return 'FUNCAO_JA_ATRIBUIDA';
      }

      /**
       * 6. Impede rebaixar o último administrador ativo.
       *
       * O JOIN considera somente contas que não
       * passaram pelo soft delete.
       */
      if (
        membroAlvo.funcao === 'ADMINISTRADOR' &&
        novaFuncao === 'MEMBRO'
      ) {
        const quantidadeAdministradoresAtivos =
          await membroRepository
            .createQueryBuilder('membro')
            .innerJoin(
              UsuarioOrmEntity,
              'usuario',
              'usuario.id = membro.usuarioId AND usuario.excluidoEm IS NULL',
            )
            .where('membro.circuloId = :circuloId', {
              circuloId,
            })
            .andWhere('membro.funcao = :funcao', {
              funcao: 'ADMINISTRADOR',
            })
            .getCount();

        if (quantidadeAdministradoresAtivos <= 1) {
          return 'ULTIMO_ADMINISTRADOR';
        }
      }

      /**
       * 7. Atualiza a função na mesma transação.
       */
      membroAlvo.funcao = novaFuncao;

      await membroRepository.save(membroAlvo);

      return 'FUNCAO_ALTERADA';
    });
  }
}
