/**
 * Identificador utilizado pelo contêiner de DI.
 *
 * Interfaces TypeScript desaparecem em runtime,
 * então utilizamos um Symbol para identificar
 * qual implementação deve ser injetada.
 */
export const PASSWORD_HASHER = Symbol('PASSWORD_HASHER');