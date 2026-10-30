/**
 * Identificador utilizado pelo contêiner de injeção
 * de dependências do NestJS.
 *
 * Interfaces TypeScript são removidas na compilação.
 * Por isso, precisamos de um token que exista em runtime.
 */
export const USUARIO_REPOSITORY = Symbol('USUARIO_REPOSITORY');

