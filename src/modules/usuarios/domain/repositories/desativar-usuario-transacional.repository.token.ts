
/**
 * Token utilizado pelo NestJS para identificar
 * a implementação do repositório transacional.
 *
 * Permite que o caso de uso dependa de uma interface,
 * sem conhecer TypeORM ou outras tecnologias
 * de persistência.
 */
export const DESATIVAR_USUARIO_TRANSACIONAL_REPOSITORY = Symbol(
  'DESATIVAR_USUARIO_TRANSACIONAL_REPOSITORY',
);
