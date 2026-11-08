
/**
 * Resultados possíveis da renovação do código de convite.
 */
export type ResultadoRenovacaoCodigoConvite =
  | {
      status: 'CODIGO_RENOVADO';
      codigoConvite: string;
    }
  | {
      status: 'CIRCULO_NAO_ENCONTRADO';
    }
  | {
      status: 'USUARIO_NAO_AUTORIZADO';
    }
  | {
      status: 'CODIGO_CONVITE_DUPLICADO';
    };

/**
 * Contrato para renovar o código de convite
 * de maneira transacional.
 */
export interface RenovarCodigoConviteTransacionalRepository {
  renovar(
    circuloId: string,
    solicitanteId: string,
    novoCodigo: string,
  ): Promise<ResultadoRenovacaoCodigoConvite>;
}
