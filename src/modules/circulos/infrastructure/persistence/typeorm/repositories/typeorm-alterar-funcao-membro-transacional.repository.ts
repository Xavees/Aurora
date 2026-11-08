import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { FuncaoMembro } from '../../../../domain/entities/membro-circulo.entity.js';
import type { AlterarFuncaoMembroTransacionalRepository,ResultadoAlteracaoFuncao,} from '../../../../domain/repositories/alterar-funcao-membro-transacional.repository.js';

import { CirculoOrmEntity } from '../entities/circulo.orm-entity.js';
import { MembroCirculoOrmEntity } from '../entities/membro-circulo.orm-entity.js';

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
      /*
       * Bloqueia o círculo durante a operação.
       * Outras alterações de membros devem seguir
       * o mesmo protocolo para evitar concorrência.
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

      // Verifica se o solicitante é administrador.
      const solicitante = await membroRepository.findOne({
        where: {
          circuloId,
          usuarioId: solicitanteId,
        },
      });

      if (!solicitante || solicitante.funcao !== 'ADMINISTRADOR') {
        return 'SOLICITANTE_NAO_E_ADMINISTRADOR';
      }

      // Localiza o participante que terá sua função alterada.
      const membroAlvo = await membroRepository.findOne({
        where: {
          circuloId,
          usuarioId: usuarioAlvoId,
        },
      });

      if (!membroAlvo) {
        return 'MEMBRO_NAO_ENCONTRADO';
      }

      // Evita atualizações desnecessárias.
      if (membroAlvo.funcao === novaFuncao) {
        return 'FUNCAO_JA_ATRIBUIDA';
      }

      /*
       * Ao rebaixar um administrador, verificamos
       * se existe outro administrador no círculo.
       */
      if (
        membroAlvo.funcao === 'ADMINISTRADOR' &&
        novaFuncao === 'MEMBRO'
      ) {
        const quantidadeAdministradores = await membroRepository.count({
          where: {
            circuloId,
            funcao: 'ADMINISTRADOR',
          },
        });

        if (quantidadeAdministradores <= 1) {
          return 'ULTIMO_ADMINISTRADOR';
        }
      }

      // Aplica a nova função dentro da transação.
      membroAlvo.funcao = novaFuncao;

      await membroRepository.save(membroAlvo);

      return 'FUNCAO_ALTERADA';
    });
  }
}
