export type FuncaoMembro = 'ADMINISTRADOR' | 'MEMBRO';
export interface MembroCirculo {
  id: string;
  usuarioId: string;
  circuloId: string;
  funcao: FuncaoMembro;
  dataEntrada: Date;
}
