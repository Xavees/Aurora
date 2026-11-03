import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Resolve os aliases configurados no tsconfig.json.
  resolve: {
    tsconfigPaths: true,
  },

  test: {
    globals: true,
    root: './',

    // Executa somente os testes unitários.
    include: ['**/*.spec.ts'],

  coverage: {
  provider: 'v8',
  include: ['src/**/*.ts'],
  exclude: [
    'src/**/*.spec.ts',
    'src/**/*.d.ts',
    'src/main.ts',
  ],
  reporter: ['text', 'html'],
  reportsDirectory: './coverage/e2e',
},
     
    },
  },
);