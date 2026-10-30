/**
 * Contrato para operações relacionadas a senhas.
 *
 * A camada de aplicação não precisa saber qual
 * algoritmo será utilizado (Argon2id, por exemplo).
 * 
 *  To mantendo A Inversão de Dependencias.
 */
export interface PasswordHasher {
  hash(senha: string): Promise<string>;

  verificar(
    hashArmazenado: string,
    senhaInformada: string,
  ): Promise<boolean>;
}