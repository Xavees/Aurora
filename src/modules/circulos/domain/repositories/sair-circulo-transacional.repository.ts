export type ResultadoSaidaCirculo =
  | 'MEMBRO_REMOVIDO'
  | 'ADMINISTRADOR_TRANSFERIDO'
  | 'CIRCULO_DESATIVADO'
  | 'CIRCULO_NAO_ENCONTRADO'
  | 'USUARIO_NAO_PARTICIPA';

export interface SairCirculoTransacionalRepository {
  sair(
    circuloId: string,
    usuarioId: string,
  ): Promise<ResultadoSaidaCirculo>;
}
