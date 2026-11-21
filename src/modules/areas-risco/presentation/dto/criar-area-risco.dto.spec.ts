
import { describe, expect, it } from 'vitest';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { CriarAreaRiscoDto } from './criar-area-risco.dto.js';

describe('CriarAreaRiscoDto', () => {
  const dadosValidos = {
    nome: 'Rua com iluminação inoperante',
    descricao: 'Postes apagados durante a noite',
    nivelRisco: 'MEDIO',
    latitude: -23.55052,
    longitude: -46.633308,
    raioMetros: 150,
  };

  /**
   * Simula as principais configurações do
   * ValidationPipe global do Aurora.
   *
   * whitelist: remove campos sem decorators.
   * forbidNonWhitelisted: rejeita campos desconhecidos.
   */
  function validar(dados: Record<string, unknown>) {
    const dto = plainToInstance(CriarAreaRiscoDto, dados);

    return validateSync(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
  }

  it('aceita dados válidos', () => {
    expect(validar(dadosValidos)).toEqual([]);
  });

  it('aceita campos opcionais omitidos', () => {
    const erros = validar({
      nome: 'Área de teste',
      latitude: -23.55,
      longitude: -46.63,
    });

    expect(erros).toEqual([]);
  });

  it('aceita campos opcionais explicitamente nulos', () => {
    expect(
      validar({
        ...dadosValidos,
        descricao: null,
        nivelRisco: null,
        raioMetros: null,
      }),
    ).toEqual([]);
  });

  it.each([
    ['nome ausente', { nome: undefined }],
    ['nome vazio', { nome: '' }],
    ['nome acima de 100 caracteres', { nome: 'A'.repeat(101) }],
    ['nome numérico', { nome: 123 }],
    ['descrição longa', { descricao: 'A'.repeat(256) }],
    ['nível inválido', { nivelRisco: 'CRITICO' }],
    ['latitude acima do limite', { latitude: 91 }],
    ['latitude abaixo do limite', { latitude: -91 }],
    ['longitude acima do limite', { longitude: 181 }],
    ['longitude abaixo do limite', { longitude: -181 }],
    ['latitude como string', { latitude: '-23.55' }],
    ['longitude como string', { longitude: '-46.63' }],
    ['latitude com precisão excessiva', { latitude: 12.123456789 }],
    ['raio negativo', { raioMetros: -10 }],
    ['raio igual a zero', { raioMetros: 0 }],
    ['raio com mais de duas casas', { raioMetros: 10.123 }],
    ['raio acima do máximo', { raioMetros: 100000000 }],
  ])('rejeita %s', (_cenario, alteracao) => {
    const erros = validar({
      ...dadosValidos,
      ...alteracao,
    });

    expect(erros.length).toBeGreaterThan(0);
  });

  it.each([
    ['usuarioId', '42'],
    ['tipoOrigem', 'OFICIAL'],
    ['statusVerificacao', 'VERIFICADA'],
    ['verificadoPorUsuarioId', '42'],
    ['excluidoEm', '2026-01-01T12:00:00Z'],
  ])('rejeita tentativa de informar %s', (campo, valor) => {
    const erros = validar({
      ...dadosValidos,
      [campo]: valor,
    });

    // Garante que o campo proibido foi identificado.
    expect(erros.some((erro) => erro.property === campo)).toBe(true);
  });
});
