
import type { MembroCirculo } from '../entities/membro-circulo.entity.js';

export interface MembroCirculoRepository {
  buscarPorUsuarioECirculo(
    usuarioId: string,
    circuloId: string,
  ): Promise<MembroCirculo | null>;

  listarPorCirculo(circuloId: string): Promise<MembroCirculo[]>;
}
