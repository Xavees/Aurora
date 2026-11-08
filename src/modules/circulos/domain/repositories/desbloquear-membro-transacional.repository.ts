
/**
 * Resultados possíveis do desbloqueio administrativo.
 */
export type ResultadoDesbloqueioMembro =
  | 'MEMBRO_DESBLOQUEADO'
  | 'CIRCULO_NAO_ENCONTRADO'
  | 'SOLICITANTE_NAO_E_ADMINISTRADOR'
  | 'BLOQUEIO_NAO_ENCONTRADO';

/**
 * Contrato para desbloquear usuários em um círculo.
 *
 * A autorização e a remoção do bloqueio devem
 * acontecer dentro da mesma transação.
 */
export interface DesbloquearMembroTransacionalRepository {
  desbloquear(
    circuloId: string,
    solicitanteId: string,
    usuarioAlvoId: string,
  ): Promise<ResultadoDesbloqueioMembro>;
}
