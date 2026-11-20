import type { NivelRisco,AreaRisco } from '../entities/area-risco.entity.js';


/**
 * Filtros disponíveis para consultar áreas de risco.
 *
 * Inicialmente, permitiremos filtrar pelo nível de risco
 * e navegar pelos resultados usando paginação.
 */
export interface FiltrosAreaRisco {
  nivelRisco?: NivelRisco;
  pagina: number;
  limite: number;
}

/**
 * Estrutura padronizada para resultados paginados.
 */
export interface ResultadoAreasRisco {
  registros: AreaRisco[];
  total: number;
  pagina: number;
  limite: number;
}

/**
 * Contrato de acesso aos dados de Áreas de Risco.
 *
 * A camada de aplicação depende desta interface,
 * não diretamente do TypeORM ou do MariaDB.
 */
export interface AreaRiscoRepository {
  /**
   * Lista áreas de risco com filtros e paginação.
   */
  listar(filtros: FiltrosAreaRisco): Promise<ResultadoAreasRisco>;

  /**
   * Busca uma área específica pelo identificador.
   */
  buscarPorId(id: string): Promise<AreaRisco | null>;
}
