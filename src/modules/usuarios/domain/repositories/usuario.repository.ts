import type { Usuario } from '../entities/usuario.entity.js';

export interface AtualizarUsuarioData {
  nome?: string;
  telefone?: string;
  fotoUrl?: string;
}

export interface UsuarioRepository {
  buscarPorId(id: string): Promise<Usuario | null>;

  atualizar(
    id: string,
    dados: AtualizarUsuarioData,
  ): Promise<Usuario | null>;
}