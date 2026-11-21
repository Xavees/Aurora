import { IsNull } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { AreaRisco, DadosCriacaoAreaRisco} from '../../../../domain/entities/area-risco.entity.js';

import type {
  AreaRiscoRepository,
  DadosAtualizacaoAreaRisco,
  FiltrosAreaRisco,

  ResultadoAreasRisco,
} from '../../../../domain/repositories/area-risco.repository.js';

import { AreaRiscoOrmEntity } from '../entities/area-risco.orm-entity.js';

@Injectable()
export class TypeOrmAreaRiscoRepository implements AreaRiscoRepository {
  constructor(
    @InjectRepository(AreaRiscoOrmEntity)
    private readonly repository: Repository<AreaRiscoOrmEntity>,
  ) {}




async criar(dados: DadosCriacaoAreaRisco): Promise<AreaRisco> {
  return this.repository.manager.transaction(async (manager) => {
    // Insere a área como colaborativa e pendente.
    // Os dados de moderação nunca são definidos pelo cliente.
    await manager.insert(AreaRiscoOrmEntity, {
      nome: dados.nome,
      descricao: dados.descricao,
      nivelRisco: dados.nivelRisco,

      latitude: String(dados.latitude),
      longitude: String(dados.longitude),
      raioMetros:
        dados.raioMetros === null
          ? null
          : String(dados.raioMetros),

      usuarioId: dados.usuarioId,

      tipoOrigem: 'COLABORATIVA',
      statusVerificacao: 'PENDENTE',

      fonte: null,
      dataReferencia: null,
      verificadoEm: null,
      verificadoPorUsuarioId: null,
      excluidoEm: null,
    });

    /**
     * LAST_INSERT_ID() recupera o identificador
     * gerado pela conexão que executou o INSERT.
     *
     * CAST(... AS CHAR) evita perder precisão
     * ao transportar o BIGINT para o JavaScript.
     *
     * A transação mantém ambas as operações
     * na mesma conexão do MariaDB.
     */
    const registros: Array<{ id: string }> = await manager.query(
      'SELECT CAST(LAST_INSERT_ID() AS CHAR) AS id',
    );

    const id = registros[0]?.id;

    if (!id) {
      throw new Error(
        'Não foi possível recuperar o ID da área criada.',
      );
    }

    // Busca a entidade completa, incluindo as datas
    // geradas automaticamente pelo MariaDB.
    const entidade = await manager.findOneByOrFail(
      AreaRiscoOrmEntity,
      { id },
    );

    return this.paraDominio(entidade);
  });
}





/**
 * Busca uma área para operações internas de edição.
 *
 * Diferentemente de buscarPorId(), aceita registros
 * pendentes ou rejeitados, mas ignora áreas excluídas.
 *
 * A busca não concede permissão de atualização.
 */
async buscarPorIdParaEdicao(
  id: string,
): Promise<AreaRisco | null> {
  const entidade = await this.repository.findOne({
    where: {
      id,
      excluidoEm: IsNull(),
    },
  });

  return entidade ? this.paraDominio(entidade) : null;
}

/**
 * Atualiza uma área colaborativa pertencente ao usuário.
 *
 * A transação protege a leitura e a atualização contra
 * modificações concorrentes da mesma área.
 */
async atualizar(
  id: string,
  usuarioId: string,
  dados: DadosAtualizacaoAreaRisco,
): Promise<AreaRisco | null> {
  return this.repository.manager.transaction(async (manager) => {
    /**
     * O bloqueio pessimista impede que outra transação
     * altere este registro enquanto a atualização
     * estiver em andamento.
     *
     * Verificamos autoria, origem e exclusão diretamente
     * na consulta, não apenas na camada de aplicação.
     */
    const entidade = await manager.findOne(AreaRiscoOrmEntity, {
      where: {
        id,
        usuarioId,
        tipoOrigem: 'COLABORATIVA',
        excluidoEm: IsNull(),
      },
      lock: {
        mode: 'pessimistic_write',
      },
    });

    if (!entidade) {
      return null;
    }

    /**
     * Atualiza somente campos explicitamente enviados.
     * Campos ausentes (undefined) são preservados.
     * Valores null são permitidos nos campos opcionais.
     */
    await manager.update(AreaRiscoOrmEntity, id, {
      ...(dados.nome !== undefined && {
        nome: dados.nome,
      }),
      ...(dados.descricao !== undefined && {
        descricao: dados.descricao,
      }),
      ...(dados.nivelRisco !== undefined && {
        nivelRisco: dados.nivelRisco,
      }),
      ...(dados.latitude !== undefined && {
        latitude: String(dados.latitude),
      }),
      ...(dados.longitude !== undefined && {
        longitude: String(dados.longitude),
      }),
      ...(dados.raioMetros !== undefined && {
        raioMetros:
          dados.raioMetros === null
            ? null
            : String(dados.raioMetros),
      }),

      /**
       * Qualquer edição exige uma nova avaliação.
       * Assim, áreas previamente verificadas não
       * continuam públicas com dados modificados.
       */
      statusVerificacao: 'PENDENTE',
      verificadoEm: null,
      verificadoPorUsuarioId: null,
    });

    // Recupera a entidade completa, incluindo datas.
    const atualizada = await manager.findOneByOrFail(
      AreaRiscoOrmEntity,
      { id },
    );

    return this.paraDominio(atualizada);
  });
}






/**
 * Realiza a exclusão lógica de uma área colaborativa.
 *
 * O registro permanece no MariaDB, mas recebe
 * uma data no campo excluidoEm.
 *
 * Somente o autor pode excluir uma área ativa
 * cuja origem seja COLABORATIVA.
 */
async excluir(
  id: string,
  usuarioId: string,
): Promise<boolean> {
  return this.repository.manager.transaction(async (manager) => {
    /**
     * Busca a área com bloqueio pessimista.
     *
     * O bloqueio evita que duas operações concorrentes
     * modifiquem o mesmo registro simultaneamente.
     *
     * A autorização é verificada diretamente na
     * consulta executada dentro da transação.
     */
    const entidade = await manager.findOne(AreaRiscoOrmEntity, {
      where: {
        id,
        usuarioId,
        tipoOrigem: 'COLABORATIVA',
        excluidoEm: IsNull(),
      },
      lock: {
        mode: 'pessimistic_write',
      },
    });

    // Área inexistente, excluída ou não autorizada.
    if (!entidade) {
      return false;
    }

    /**
     * Soft delete:
     *
     * Não utilizamos manager.delete(), pois isso
     * apagaria o registro fisicamente.
     *
     * Registramos o momento da exclusão.
     */
    await manager.update(
      AreaRiscoOrmEntity,
      id,
      {
        excluidoEm: new Date(),
      },
    );

    return true;
  });
}























/**
 * Converte uma entidade ORM em uma entidade de domínio.
 *
 * Centralizamos a conversão aqui para que nenhuma
 * regra da aplicação dependa dos tipos do MariaDB.
 */
private paraDominio(entity: AreaRiscoOrmEntity): AreaRisco {
  return {
    id: String(entity.id),

    nome: entity.nome,
    descricao: entity.descricao,
    nivelRisco: entity.nivelRisco,

    // DECIMAL é recebido como string pelo driver.
    raioMetros:
      entity.raioMetros === null
        ? null
        : Number(entity.raioMetros),

    latitude: Number(entity.latitude),
    longitude: Number(entity.longitude),

    // Identificação da procedência.
    tipoOrigem: entity.tipoOrigem,

    // Resultado da avaliação pela moderação.
    statusVerificacao: entity.statusVerificacao,

    fonte: entity.fonte,
    dataReferencia: entity.dataReferencia,

    verificadoEm: entity.verificadoEm,

    verificadoPorUsuarioId:
      entity.verificadoPorUsuarioId === null
        ? null
        : String(entity.verificadoPorUsuarioId),

    // Permite identificar registros logicamente excluídos.
    excluidoEm: entity.excluidoEm,

    dataCriacao: entity.dataCriacao,
    dataAtualizacao: entity.dataAtualizacao,

    usuarioId:
      entity.usuarioId === null
        ? null
        : String(entity.usuarioId),
  };
}

  /**
   * Lista áreas com filtro opcional por nível de risco.
   *
   * A ordenação por data e ID torna a paginação
   * determinística mesmo quando registros possuem
   * a mesma data de criação.
   */
  async listar(
    filtros: FiltrosAreaRisco,
  ): Promise<ResultadoAreasRisco> {
    const { nivelRisco, pagina, limite } = filtros;

   



/**
 * Consultas comuns mostram somente áreas aprovadas
 * e que não foram excluídas logicamente.
 *
 * O filtro é aplicado diretamente no banco para
 * não expor registros restritos e manter a paginação correta.
 */
const query = this.repository
  .createQueryBuilder('area')
  .where('area.statusVerificacao = :status', {
    status: 'VERIFICADA',
  })
  .andWhere('area.excluidoEm IS NULL');






    if (nivelRisco !== undefined) {
      query.andWhere('area.nivelRisco = :nivelRisco', {
        nivelRisco,
      });
    }

    query
      .orderBy('area.dataCriacao', 'DESC')
      .addOrderBy('area.id', 'DESC')
      .skip((pagina - 1) * limite)
      .take(limite);

    const [entities, total] = await query.getManyAndCount();

    return {
      registros: entities.map((entity) =>
        this.paraDominio(entity),
      ),
      total,
      pagina,
      limite,
    };
  }

  /**
   * Busca uma área pelo identificador.
   *
   * Retorna null quando o registro não existe.
   * O caso de uso decidirá como tratar essa ausência.
   */
  async buscarPorId(id: string): Promise<AreaRisco | null> {
    const entity = await this.repository.findOne({
       where: {
       id,
       statusVerificacao: 'VERIFICADA',
       excluidoEm: IsNull(),
  },
});
    if (!entity) {
      return null;
    }

    return this.paraDominio(entity);
  }








}
