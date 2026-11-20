
/**
 * Classificação da gravidade de uma área de risco.
 *
 * Não representa a confiabilidade da informação.
 */
export type NivelRisco = 'BAIXO' | 'MEDIO' | 'ALTO';

/**
 * Identifica a procedência da informação.
 */
export type TipoOrigemAreaRisco =
  | 'OFICIAL'
  | 'COLABORATIVA';

/**
 * Representa o resultado do processo de moderação.
 *
 * VERIFICADA significa que o registro passou pela
 * avaliação do Aurora, não que o risco foi comprovado.
 */
export type StatusVerificacaoAreaRisco =
  | 'PENDENTE'
  | 'VERIFICADA'
  | 'REJEITADA';

/**
 * Entidade de domínio de Áreas de Risco.
 *
 * Não depende de TypeORM, NestJS ou detalhes do banco.
 */
export interface AreaRisco {
  id: string;

  nome: string;
  descricao: string | null;
  nivelRisco: NivelRisco | null;

  latitude: number;
  longitude: number;
  raioMetros: number | null;

  /**
   * NULL representa um registro legado cuja
   * procedência ainda não foi identificada.
   */
  tipoOrigem: TipoOrigemAreaRisco | null;

  /**
   * NULL representa um registro que ainda não
   * possui classificação de moderação.
   */
  statusVerificacao: StatusVerificacaoAreaRisco | null;

  fonte: string | null;
  dataReferencia: Date | null;

  verificadoEm: Date | null;
  verificadoPorUsuarioId: string | null;

  /**
   * Exclusão lógica para preservar rastreabilidade.
   */
  excluidoEm: Date | null;

  dataCriacao: Date;
  dataAtualizacao: Date;

  usuarioId: string | null;
}
