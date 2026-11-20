
/**
 * Identificador utilizado pelo NestJS para localizar
 * a implementação concreta do repositório.
 *
 * Permite que os casos de uso dependam de uma abstração,
 * sem conhecer diretamente o TypeORM.
 */
export const AREA_RISCO_REPOSITORY = Symbol(
  'AREA_RISCO_REPOSITORY',
);
