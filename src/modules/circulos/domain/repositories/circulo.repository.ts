import type { Circulo } from '../entities/circulo.entity.js';

export interface CriarCirculoDados {
  nome: string;
  codigoConvite: string;
}

export interface AtualizarCirculoDados {
  nome?: string;
}


export interface CirculoRepository {
  criar(dados: CriarCirculoDados): Promise<Circulo>;

  buscarPorId(id: string): Promise<Circulo | null>;

  buscarPorCodigoConvite(
    codigoConvite: string,
  ): Promise<Circulo | null>;

  listarPorUsuario(usuarioId: string): Promise<Circulo[]>;

atualizar(
  circuloId: string,
  dados: AtualizarCirculoDados,
): Promise<Circulo | null>;


remover(circuloId: string): Promise<boolean>;


}
