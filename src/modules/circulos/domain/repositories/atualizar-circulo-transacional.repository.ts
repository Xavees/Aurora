
import type { Circulo } from '../entities/circulo.entity.js';

/**
 * Dados permitidos na atualização de um círculo.
 */
export interface AtualizarCirculoTransacionalDados {
  nome: string;
}

/**
 * Possíveis resultados da atualização.
 */
export type ResultadoAtualizacaoCirculo =
  | { status: 'CIRCULO_ATUALIZADO'; circulo: Circulo }
  | { status: 'CIRCULO_NAO_ENCONTRADO' }
  | { status: 'USUARIO_NAO_AUTORIZADO' };

/**
 * Contrato para atualização transacional de círculos.
 *
 * A implementação deverá bloquear o círculo,
 * verificar a permissão administrativa e atualizar
 * seus dados dentro da mesma transação.
 */
export interface AtualizarCirculoTransacionalRepository {
  atualizar(
    circuloId: string,
    usuarioId: string,
    dados: AtualizarCirculoTransacionalDados,
  ): Promise<ResultadoAtualizacaoCirculo>;
}
