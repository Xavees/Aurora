/**
 * Token que permite injetar a implementação concreta
 * sem acoplar o caso de uso ao TypeORM.
 */
export const AUTH_REPOSITORY = Symbol('AUTH_REPOSITORY');