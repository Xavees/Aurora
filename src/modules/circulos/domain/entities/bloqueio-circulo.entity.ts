
/**
 * Representa um bloqueio administrativo
 * de um usuário em determinado círculo.
 *
 * O bloqueio permanece mesmo após a remoção
 * da participação do usuário.
 */
export interface BloqueioCirculo {
  id: string;

  circuloId: string;

  usuarioId: string;

  bloqueadoPorId: string;

  dataBloqueio: Date;
}
