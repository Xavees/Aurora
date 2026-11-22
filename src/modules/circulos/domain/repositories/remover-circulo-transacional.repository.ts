
export type ResultadoRemocaoCirculo =
  | 'CIRCULO_REMOVIDO'
  | 'CIRCULO_NAO_ENCONTRADO'
  | 'USUARIO_NAO_AUTORIZADO';

export interface RemoverCirculoTransacionalRepository {
  remover(
    circuloId: string,
    usuarioId: string,
  ): Promise<ResultadoRemocaoCirculo>;
}
