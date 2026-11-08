export type ResultadoRemocaoMembro =
  | 'MEMBRO_REMOVIDO'
  | 'CIRCULO_NAO_ENCONTRADO'
  | 'SOLICITANTE_NAO_E_ADMINISTRADOR'
  | 'MEMBRO_NAO_ENCONTRADO'
  | 'AUTO_REMOCAO_NAO_PERMITIDA'
  | 'REMOCAO_ADMINISTRADOR_NAO_PERMITIDA';

export interface RemoverMembroTransacionalRepository {
  remover(
    circuloId: string,
    solicitanteId: string,
    membroId: string,
  ): Promise<ResultadoRemocaoMembro>;
}
