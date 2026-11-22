
import { Injectable } from '@nestjs/common';
import { DataSource, In } from 'typeorm';

import type { DesativarUsuarioTransacionalRepository } from '../../../../domain/repositories/desativar-usuario-transacional.repository.js';

import { UsuarioOrmEntity } from '../entities/usuario.orm-entity.js';
import { CirculoOrmEntity } from '../../../../../circulos/infrastructure/persistence/typeorm/entities/circulo.orm-entity.js';
import { MembroCirculoOrmEntity } from '../../../../../circulos/infrastructure/persistence/typeorm/entities/membro-circulo.orm-entity.js';
import { selecionarSucessorCirculo } from '../../../../../circulos/domain/services/selecionar-sucessor-circulo.js';

const MAX_TENTATIVAS = 3;

class ParticipacoesAlteradasError extends Error {
  constructor() {
    super('As participações mudaram durante a transação.');
  }
}

function ordenarIds(ids: Iterable<string>): string[] {
  return [...new Set(ids)].sort((a, b) => {
    const idA = BigInt(a);
    const idB = BigInt(b);

    return idA < idB ? -1 : idA > idB ? 1 : 0;
  });
}

function mesmaLista(
  a: readonly string[],
  b: readonly string[],
): boolean {
  return a.length === b.length && a.every((id, i) => id === b[i]);
}

function assinaturaMembros(
  membros: readonly MembroCirculoOrmEntity[],
): string[] {
  return [...membros]
    .sort((a, b) => {
      const idA = BigInt(a.id);
      const idB = BigInt(b.id);

      return idA < idB ? -1 : idA > idB ? 1 : 0;
    })
    .map((membro) =>
      JSON.stringify([
        membro.id,
        membro.circuloId,
        membro.usuarioId,
        membro.funcao,
        membro.dataEntrada.getTime(),
      ]),
    );
}

function erroConcorrencia(error: unknown): boolean {
  if (error instanceof ParticipacoesAlteradasError) {
    return true;
  }

  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const driverError =
    'driverError' in error ? error.driverError : error;

  if (typeof driverError !== 'object' || driverError === null) {
    return false;
  }

  const codigo =
    'code' in driverError ? driverError.code : undefined;

  const numero =
    'errno' in driverError ? driverError.errno : undefined;

  return codigo === 'ER_LOCK_DEADLOCK' || numero === 1213;
}

@Injectable()
export class TypeOrmDesativarUsuarioTransacionalRepository
  implements DesativarUsuarioTransacionalRepository
{
  constructor(private readonly dataSource: DataSource) {}

  async desativar(id: string): Promise<boolean> {
    for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
      try {
        return await this.desativarEmTransacao(id);
      } catch (error) {
        if (
          !erroConcorrencia(error) ||
          tentativa === MAX_TENTATIVAS
        ) {
          throw error;
        }
      }
    }

    throw new Error('Não foi possível concluir a desativação.');
  }

  private async desativarEmTransacao(id: string): Promise<boolean> {
    return this.dataSource.transaction('READ COMMITTED', async (manager) => {
      const usuarioRepository = manager.getRepository(UsuarioOrmEntity);
      const circuloRepository = manager.getRepository(CirculoOrmEntity);
      const membroRepository = manager.getRepository(
        MembroCirculoOrmEntity,
      );

      // Descobre as participações antes dos bloqueios.
      const participacoesIniciais = await membroRepository.find({
        where: { usuarioId: id },
      });

      const circulosIds = ordenarIds(
        participacoesIniciais.map((membro) => membro.circuloId),
      );

      const membrosIniciais =
        circulosIds.length > 0
          ? await membroRepository.find({
              where: { circuloId: In(circulosIds) },
            })
          : [];

      const usuariosIds = ordenarIds([
        id,
        ...membrosIniciais.map((membro) => membro.usuarioId),
      ]);

      const usuarios = new Map<string, UsuarioOrmEntity>();

      // Bloqueia as contas envolvidas em ordem crescente.
      for (const usuarioId of usuariosIds) {
        const usuario = await usuarioRepository
          .createQueryBuilder('usuario')
          .withDeleted()
          .setLock('pessimistic_write')
          .where('usuario.id = :usuarioId', { usuarioId })
          .getOne();

        if (usuario) {
          usuarios.set(usuarioId, usuario);
        }
      }

      const usuarioAtual = usuarios.get(id);

      if (!usuarioAtual || usuarioAtual.excluidoEm) {
        return false;
      }

      const circulosAtivos = new Set<string>();

      // Bloqueia os círculos após as contas.
      for (const circuloId of circulosIds) {
        const circulo = await circuloRepository
          .createQueryBuilder('circulo')
          .withDeleted()
          .setLock('pessimistic_write')
          .where('circulo.id = :circuloId', { circuloId })
          .getOne();

        if (circulo && !circulo.deletedAt) {
          circulosAtivos.add(circuloId);
        }
      }

      // Confirma que os vínculos do usuário não mudaram.
      const participacoesAtuais = await membroRepository.find({
        where: { usuarioId: id },
      });

      const circulosAtuaisIds = ordenarIds(
        participacoesAtuais.map((membro) => membro.circuloId),
      );

      if (!mesmaLista(circulosIds, circulosAtuaisIds)) {
        throw new ParticipacoesAlteradasError();
      }

      const membrosAtuais =
        circulosIds.length > 0
          ? await membroRepository.find({
              where: { circuloId: In(circulosIds) },
              order: { dataEntrada: 'ASC', id: 'ASC' },
            })
          : [];

      // Compara IDs, usuários, círculos, funções e datas de entrada.
      if (
        !mesmaLista(
          assinaturaMembros(membrosIniciais),
          assinaturaMembros(membrosAtuais),
        )
      ) {
        throw new ParticipacoesAlteradasError();
      }

      // Confirma que nenhuma conta envolvida ficou fora dos bloqueios.
      const usuariosAtuaisIds = ordenarIds([
        id,
        ...membrosAtuais.map((membro) => membro.usuarioId),
      ]);

      if (!mesmaLista(usuariosIds, usuariosAtuaisIds)) {
        throw new ParticipacoesAlteradasError();
      }

      for (const circuloId of circulosIds) {
        if (!circulosAtivos.has(circuloId)) {
          continue;
        }

        const membrosCirculo = membrosAtuais.filter(
          (membro) => membro.circuloId === circuloId,
        );

        const membrosRestantes = membrosCirculo.filter((membro) => {
          const usuario = usuarios.get(membro.usuarioId);

          return (
            membro.usuarioId !== id &&
            usuario != null &&
            !usuario.excluidoEm
          );
        });

        // Desativa o círculo sem participantes ativos restantes.
        if (membrosRestantes.length === 0) {
          await circuloRepository.softDelete(circuloId);
          continue;
        }

        const existeAdministrador = membrosRestantes.some(
          (membro) => membro.funcao === 'ADMINISTRADOR',
        );

        if (existeAdministrador) {
          continue;
        }

        // Seleciona o participante ativo mais antigo.
        const sucessor = selecionarSucessorCirculo(
          membrosRestantes.map((membro) => ({
            id: membro.id,
            usuarioId: membro.usuarioId,
            dataEntrada: membro.dataEntrada,
            ativo: true,
          })),
          id,
        );

        if (!sucessor) {
          throw new Error(
            'Não foi possível selecionar o sucessor do círculo.',
          );
        }

        await membroRepository.update(
          { id: sucessor.id },
          { funcao: 'ADMINISTRADOR' },
        );
      }

      // Remove todas as participações da conta.
      await membroRepository.delete({ usuarioId: id });

      // Executa o soft delete na mesma transação.
      const resultado = await usuarioRepository.softDelete(id);

      if ((resultado.affected ?? 0) !== 1) {
        throw new Error('Não foi possível desativar a conta.');
      }

      return true;
    });
  }
}
