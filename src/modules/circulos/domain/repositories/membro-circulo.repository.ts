import type {
  FuncaoMembro,
  MembroCirculo,
} from '../entities/membro-circulo.entity.js';

export interface AdicionarMembroDados {
  usuarioId: string;
  circuloId: string;
  funcao: FuncaoMembro;
}

export interface MembroCirculoRepository {
  adicionar(dados: AdicionarMembroDados): Promise<MembroCirculo>;

  buscarPorUsuarioECirculo(
    usuarioId: string,
    circuloId: string,
  ): Promise<MembroCirculo | null>;

  listarPorCirculo(circuloId: string): Promise<MembroCirculo[]>;

  remover(usuarioId: string, circuloId: string): Promise<boolean>;

  alterarFuncao(
    usuarioId: string,
    circuloId: string,
    funcao: FuncaoMembro,
  ): Promise<MembroCirculo | null>;
}
