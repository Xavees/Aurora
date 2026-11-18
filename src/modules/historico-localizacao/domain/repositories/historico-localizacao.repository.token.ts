
/**
 * Token utilizado pelo NestJS para injetar
 * a implementação do repositório de histórico.
 *
 * Permite que os casos de uso dependam da interface
 * de domínio, sem conhecer o TypeORM.
 */
export const HISTORICO_LOCALIZACAO_REPOSITORY = Symbol(
  'HISTORICO_LOCALIZACAO_REPOSITORY',
);
