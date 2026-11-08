
import type { 
  FuncaoMembro,
  MembroCirculo,
} from '../../domain/entities/membro-circulo.entity.js';

export class MembroCirculoResponseDto {
  id!: string;
  usuarioId!: string;
  circuloId!: string;
  funcao!: FuncaoMembro;
  dataEntrada!: Date;

  /**
   * Converte a entidade de domínio para
   * o formato público de resposta da API.
   */
  static fromDomain(
    membro: MembroCirculo,
  ): MembroCirculoResponseDto {
    const response = new MembroCirculoResponseDto();

    response.id = membro.id;
    response.usuarioId = membro.usuarioId;
    response.circuloId = membro.circuloId;
    response.funcao = membro.funcao;
    response.dataEntrada = membro.dataEntrada;

    return response;
  }
}
