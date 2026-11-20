import { IsNull } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { AreaRisco } from '../../../../domain/entities/area-risco.entity.js';

import type {
  AreaRiscoRepository,
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
