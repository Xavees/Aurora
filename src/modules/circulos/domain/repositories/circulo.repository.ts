
import type { Circulo } from '../entities/circulo.entity.js';

export interface CirculoRepository {
  buscarPorId(id: string): Promise<Circulo | null>;

  buscarPorCodigoConvite(
    codigoConvite: string,
  ): Promise<Circulo | null>;

  listarPorUsuario(usuarioId: string): Promise<Circulo[]>;
}
