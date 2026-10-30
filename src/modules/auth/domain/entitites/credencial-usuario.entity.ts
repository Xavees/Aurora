/**
 * Representa apenas os dados necessários
 * para autenticar um usuário.
 *
 * O hash nunca deve ser retornado ao cliente.
 */
export interface CredencialUsuario {
  id: string;
  email: string;
  senhaHash: string | null;
}