
import type { Circulo } from '../entities/circulo.entity.js';

export interface CriarCirculoTransacionalDados {
  nome: string;
  codigoConvite: string;
  criadorId: string;
}

/**
 * Resultados possíveis da criação de um círculo.
 */
export type ResultadoCriacaoCirculo =
  | { status: 'CIRCULO_CRIADO'; circulo: Circulo }
  | { status: 'CODIGO_CONVITE_DUPLICADO' };

export interface CriarCirculoTransacionalRepository {
  criarComAdministrador(
    dados: CriarCirculoTransacionalDados,
  ): Promise<ResultadoCriacaoCirculo>;
}
