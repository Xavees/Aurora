import type { CredencialUsuario } from '../entitites/credencial-usuario.entity.js';

/**
 * Dados necessários para persistir um novo usuário.
 * O repositório recebe o hash, nunca a senha original.
 */
export interface CriarUsuarioData {
  nome: string;
  email: string;
  senhaHash: string;
}

export interface AuthRepository {
  buscarPorEmail(email: string): Promise<CredencialUsuario | null>;

  criarUsuario(dados: CriarUsuarioData): Promise<string>;
}