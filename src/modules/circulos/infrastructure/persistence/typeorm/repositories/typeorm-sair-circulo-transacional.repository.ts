
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import type {
  ResultadoSaidaCirculo,
  SairCirculoTransacionalRepository,
} from '../../../../domain/repositories/sair-circulo-transacional.repository.js';

import { CirculoOrmEntity } from '../entities/circulo.orm-entity.js';
import { MembroCirculoOrmEntity } from '../entities/membro-circulo.orm-entity.js';

import { UsuarioOrmEntity } from '../../../../../usuarios/infrastructure/persistence/typeorm/entities/usuario.orm-entity.js';

@Injectable()
export class TypeOrmSairCirculoTransacionalRepository
  implements SairCirculoTransacionalRepository
{
  constructor(private readonly dataSource: DataSource) {}

  async sair(
    circuloId: string,
    usuarioId: string,
  ): Promise<ResultadoSaidaCirculo> {
    return this.dataSource.transaction(async (manager) => {
      /**
       * 1. Bloqueia a conta antes de consultar o círculo.
       *
       * Assim, a saída não disputa a participação
       * simultaneamente com a desativação da mesma conta.
       *
       * Essa ordem deverá ser respeitada pelos demais
       * fluxos que também bloqueiam contas e círculos.
       */
      const usuario = await manager
        .getRepository(UsuarioOrmEntity)
        .createQueryBuilder('usuario')
        .setLock('pessimistic_write')
        .where('usuario.id = :usuarioId', { usuarioId })
        .andWhere('usuario.excluidoEm IS NULL')
        .getOne();

      if (!usuario) {
        return 'USUARIO_NAO_PARTICIPA';
      }

      /**
       * 2. Bloqueia o círculo.
       *
       * O bloqueio serializa as operações de saída
       * que seguem o mesmo protocolo.
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

      const membroAtual = await membroRepository.findOne({
        where: {
          circuloId,
          usuarioId,
        },
      });

      if (!membroAtual) {
        return 'USUARIO_NAO_PARTICIPA';
      }

      /**
       * 3. Consulta os participantes em ordem determinística.
       *
       * A verificação da atividade das contas dos
       * possíveis sucessores será acrescentada
       * na etapa específica de sucessão.
       */
      const membros = await membroRepository.find({
        where: { circuloId },
        order: {
          dataEntrada: 'ASC',
          id: 'ASC',
        },
      });

      /**
       * 4. Se o usuário é o único participante,
       * remove sua participação e desativa o círculo.
       */
      if (membros.length === 1) {
        await membroRepository.remove(membroAtual);

        await manager
          .getRepository(CirculoOrmEntity)
          .softDelete(circuloId);

        return 'CIRCULO_DESATIVADO';
      }

      /**
       * 5. Se o usuário é administrador,
       * verifica se existe outro administrador.
       */
      if (membroAtual.funcao === 'ADMINISTRADOR') {
        const outrosMembros = membros.filter(
          (membro) => membro.id !== membroAtual.id,
        );

        const existeOutroAdministrador = outrosMembros.some(
          (membro) => membro.funcao === 'ADMINISTRADOR',
        );

        if (!existeOutroAdministrador) {
          const sucessor = outrosMembros[0];

          sucessor.funcao = 'ADMINISTRADOR';
          await membroRepository.save(sucessor);

          await membroRepository.remove(membroAtual);

          return 'ADMINISTRADOR_TRANSFERIDO';
        }
      }

      /**
       * 6. Quando não há necessidade de sucessão,
       * remove somente a participação atual.
       */
      await membroRepository.remove(membroAtual);

      return 'MEMBRO_REMOVIDO';
    });
  }
}
