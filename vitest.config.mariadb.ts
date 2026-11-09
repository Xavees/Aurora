import { defineConfig } from 'vitest/config';
import e2e from './vitest.config.e2e.js';

export default defineConfig({
  ...e2e,
  test: {
    ...e2e.test,
    include: ['test/circulos/*.mariadb-spec.ts'],
    testTimeout: 15_000,
  },
});
