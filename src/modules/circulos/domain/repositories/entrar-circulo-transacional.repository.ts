
import type { MembroCirculo } from '../entities/membro-circulo.entity.js';

/**
 * Possíveis resultados da tentativa de entrada em um círculo.
 */
export type ResultadoEntradaCirculo =
  | { status: 'MEMBRO_ADICIONADO'; membro: MembroCirculo }
  | { status: 'CIRCULO_NAO_ENCONTRADO' }
  | { status: 'USUARIO_JA_PARTICIPA' }
  | { status: 'USUARIO_BLOQUEADO' };

/**
 * Contrato para entrada de participantes em círculos.
 *
 * A implementação deve verificar o convite, o bloqueio
 * administrativo e a participação dentro da transação.
 */
export interface EntrarCirculoTransacionalRepository {
  entrar(
    codigoConvite: string,
    usuarioId: string,
  ): Promise<ResultadoEntradaCirculo>;
}
