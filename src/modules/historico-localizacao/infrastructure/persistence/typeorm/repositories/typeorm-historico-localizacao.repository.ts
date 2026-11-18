
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { HistoricoLocalizacao } from '../../../../domain/entities/historico-localizacao.entity.js';

import type {
  FiltrosHistoricoLocalizacao,
  HistoricoLocalizacaoRepository,
  ResultadoHistoricoLocalizacao,
} from '../../../../domain/repositories/historico-localizacao.repository.js';

import { HistoricoLocalizacaoOrmEntity } from '../entities/historico-localizacao.orm-entity.js';

@Injectable()
export class TypeOrmHistoricoLocalizacaoRepository
  implements HistoricoLocalizacaoRepository
{
  constructor(
    @InjectRepository(HistoricoLocalizacaoOrmEntity)
    private readonly repository: Repository<HistoricoLocalizacaoOrmEntity>,
  ) {}

  /**
   * Converte a entidade do banco para o domínio.
   *
   * O MariaDB retorna campos DECIMAL como string.
   * Aqui convertemos esses valores para number.
   */
  private paraDominio(
    entidade: HistoricoLocalizacaoOrmEntity,
  ): HistoricoLocalizacao {
    return {
      id: entidade.id,
      usuarioId: entidade.usuarioId,
      dispositivoId: entidade.dispositivoId,

      latitude: Number(entidade.latitude),
      longitude: Number(entidade.longitude),

      altitudeMetros:
        entidade.altitudeMetros === null
          ? null
          : Number(entidade.altitudeMetros),

      velocidadeKmh:
        entidade.velocidadeKmh === null
          ? null
          : Number(entidade.velocidadeKmh),

      satelites: entidade.satelites,
      bateria: entidade.bateria,
      sos: Boolean(entidade.sos),

      dataHoraGps: entidade.dataHoraGps,
      recebidoEm: entidade.recebidoEm,
    };
  }

  /**
   * Consulta o histórico de um usuário.
   *
   * Os registros mais recentes aparecem primeiro.
   * A paginação utiliza LIMIT e OFFSET.
   */
  async listar(
    filtros: FiltrosHistoricoLocalizacao,
  ): Promise<ResultadoHistoricoLocalizacao> {
    const query = this.repository
      .createQueryBuilder('historico')
      .where('historico.usuarioId = :usuarioId', {
        usuarioId: filtros.usuarioId,
      });

    // Aplica o limite inferior do período.
    if (filtros.dataInicio) {
      query.andWhere(
        'historico.dataHoraGps >= :dataInicio',
        { dataInicio: filtros.dataInicio },
      );
    }

    // Aplica o limite superior do período.
    if (filtros.dataFim) {
      query.andWhere(
        'historico.dataHoraGps <= :dataFim',
        { dataFim: filtros.dataFim },
      );
    }

    // A ordenação secundária evita resultados ambíguos
    // quando dois registros possuem o mesmo horário.
    query
      .orderBy('historico.dataHoraGps', 'DESC')
      .addOrderBy('historico.id', 'DESC')
      .skip((filtros.pagina - 1) * filtros.limite)
      .take(filtros.limite);

    const [entidades, total] = await query.getManyAndCount();

    return {
      registros: entidades.map((entidade) =>
        this.paraDominio(entidade),
      ),
      total,
      pagina: filtros.pagina,
      limite: filtros.limite,
    };
  }

  /**
   * Busca uma localização específica.
   *
   * O filtro por usuarioId impede que o repositório
   * retorne um registro pertencente a outro usuário.
   */
  async buscarPorId(
    id: string,
    usuarioId: string,
  ): Promise<HistoricoLocalizacao | null> {
    const entidade = await this.repository.findOne({
      where: {
        id,
        usuarioId,
      },
    });

    if (!entidade) {
      return null;
    }

    return this.paraDominio(entidade);
  }
}
