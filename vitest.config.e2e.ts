import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },

  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],

    // Evita conflitos entre testes que compartilham o banco.
    fileParallelism: false,

    // Configura o ambiente antes de carregar os testes.
    setupFiles: ['./test/setup-e2e.ts'],
  },
});