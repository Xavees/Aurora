
import type {
  NivelRisco,
  AreaRisco,
  DadosCriacaoAreaRisco,
} from '../entities/area-risco.entity.js';

/**
 * Filtros disponíveis para consultar áreas de risco.
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
 * Campos que o usuário pode modificar em uma área.
 *
 * O Partial permite atualizar apenas os campos enviados.
 *
 * Não incluímos usuarioId, tipoOrigem ou statusVerificacao:
 * esses dados não podem ser definidos livremente pelo cliente.
 */
export type DadosAtualizacaoAreaRisco = Partial<
  Pick<
    DadosCriacaoAreaRisco,
    | 'nome'
    | 'descricao'
    | 'nivelRisco'
    | 'latitude'
    | 'longitude'
    | 'raioMetros'
  >
>;

/**
 * Contrato de acesso aos dados de Áreas de Risco.
 *
 * A camada de aplicação depende desta interface,
 * não diretamente do TypeORM ou do MariaDB.
 */
export interface AreaRiscoRepository {
  /**
   * Lista áreas verificadas e não excluídas.
   */
  listar(filtros: FiltrosAreaRisco): Promise<ResultadoAreasRisco>;

  /**
   * Consulta pública por ID.
   *
   * Retorna somente áreas verificadas e ativas.
   */
  buscarPorId(id: string): Promise<AreaRisco | null>;

  /**
   * Busca uma área para operações de edição.
   *
   * Inclui áreas pendentes e rejeitadas,
   * mas não registros excluídos logicamente.
   *
   * Atenção: encontrar a área NÃO autoriza sua edição.
   * A permissão será verificada pelo caso de uso.
   */
  buscarPorIdParaEdicao(id: string): Promise<AreaRisco | null>;

  /**
   * Persiste uma nova área colaborativa.
   *
   * A implementação deve definir:
   * - tipoOrigem = COLABORATIVA
   * - statusVerificacao = PENDENTE
   */
  criar(dados: DadosCriacaoAreaRisco): Promise<AreaRisco>;

  /**
   * Atualiza os campos permitidos de uma área.
   *
   * A implementação futura deverá garantir as regras
   * de autoria, integridade e moderação, inclusive
   * diante de alterações concorrentes.
   *
   * Retorna null quando a atualização não encontrar
   * uma área elegível.
   */
  atualizar(
  id: string,
  usuarioId: string,
  dados: DadosAtualizacaoAreaRisco,
): Promise<AreaRisco | null>;





/**
 * Realiza a exclusão lógica de uma área de risco.
 *
 * Regras:
 * - Apenas o autor pode excluir a área.
 * - A área precisa ser colaborativa.
 * - Áreas já excluídas não podem ser excluídas novamente.
 * - O registro permanece no banco de dados.
 *
 * A implementação deverá verificar essas condições
 * dentro de uma transação, evitando problemas de
 * concorrência entre operações.
 *
 * @returns true quando a exclusão for realizada.
 * @returns false quando não houver uma área elegível.
 */
excluir(
  id: string,
  usuarioId: string,
): Promise<boolean>;
























}
