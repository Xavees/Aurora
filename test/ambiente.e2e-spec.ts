import { describe, expect, it } from 'vitest';

describe('Ambiente E2E', () => {
  it('deve utilizar exclusivamente as credenciais de testes', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.DB_DATABASE).toBe('aurora_test');
    expect(process.env.DB_USERNAME).toBe('aurora_e2e');
  });
});