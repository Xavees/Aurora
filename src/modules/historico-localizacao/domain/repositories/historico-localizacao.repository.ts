
import type { HistoricoLocalizacao } from '../entities/historico-localizacao.entity.js';

/**
 * Filtros disponíveis para consultar o histórico.
 */
export interface FiltrosHistoricoLocalizacao {
  usuarioId: string;
  dataInicio?: Date;
  dataFim?: Date;
  limite: number;
  pagina: number;
}

/**
 * Resultado paginado de uma consulta ao histórico.
 */
export interface ResultadoHistoricoLocalizacao {
  registros: HistoricoLocalizacao[];
  total: number;
  pagina: number;
  limite: number;
}

/**
 * Contrato de persistência do Histórico de Localização.
 *
 * A camada de aplicação depende desta interface,
 * não da implementação concreta com TypeORM.
 */
export interface HistoricoLocalizacaoRepository {
  /**
   * Lista registros de um usuário, com filtros
   * de período e paginação.
   */
  listar(
    filtros: FiltrosHistoricoLocalizacao,
  ): Promise<ResultadoHistoricoLocalizacao>;

  /**
   * Busca um registro específico pelo ID,
   * garantindo que pertença ao usuário informado.
   */
  buscarPorId(
    id: string,
    usuarioId: string,
  ): Promise<HistoricoLocalizacao | null>;
}
