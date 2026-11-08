
/**
 * Possíveis resultados da tentativa de remoção
 * lógica de um círculo.
 */
export type ResultadoRemocaoCirculo =
  | 'CIRCULO_REMOVIDO'
  | 'CIRCULO_NAO_ENCONTRADO'
  | 'USUARIO_NAO_AUTORIZADO';

/**
 * Contrato para remoção transacional de círculos.
 *
 * A implementação deverá bloquear o círculo,
 * verificar a autorização do administrador
 * e executar o soft delete na mesma transação.
 */
export interface RemoverCirculoTransacionalRepository {
  remover(
    circuloId: string,
    usuarioId: string,
  ): Promise<ResultadoRemocaoCirculo>;
}
