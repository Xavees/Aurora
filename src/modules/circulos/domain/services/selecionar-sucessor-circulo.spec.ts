
import { describe, expect, it } from 'vitest';

import {
  selecionarSucessorCirculo,
  type CandidatoSucessao,
} from './selecionar-sucessor-circulo.js';

describe('selecionarSucessorCirculo', () => {
  const candidato = (
    id: string,
    usuarioId: string,
    dataEntrada: string,
    ativo = true,
  ): CandidatoSucessao => ({
    id,
    usuarioId,
    dataEntrada: new Date(dataEntrada),
    ativo,
  });

  it('seleciona o membro ativo mais antigo', () => {
    const membros = [
      candidato('3', '30', '2026-03-01'),
      candidato('2', '20', '2026-02-01'),
      candidato('1', '10', '2026-01-01'),
    ];

    const sucessor = selecionarSucessorCirculo(membros, '99');

    expect(sucessor?.usuarioId).toBe('10');
  });

  it('ignora participantes com contas desativadas', () => {
    const membros = [
      candidato('1', '10', '2026-01-01', false),
      candidato('2', '20', '2026-02-01'),
    ];

    expect(
      selecionarSucessorCirculo(membros, '99')?.usuarioId,
    ).toBe('20');
  });

  it('ignora o usuário que está saindo', () => {
    const membros = [
      candidato('1', '10', '2026-01-01'),
      candidato('2', '20', '2026-02-01'),
    ];

    expect(
      selecionarSucessorCirculo(membros, '10')?.usuarioId,
    ).toBe('20');
  });

  it('desempata pela participação com menor BIGINT', () => {
    const membros = [
      candidato('9007199254740993', '30', '2026-01-01'),
      candidato('9007199254740992', '20', '2026-01-01'),
    ];

    expect(
      selecionarSucessorCirculo(membros, '99')?.usuarioId,
    ).toBe('20');
  });

  it('retorna null quando não existem sucessores elegíveis', () => {
    const membros = [
      candidato('1', '10', '2026-01-01'),
      candidato('2', '20', '2026-02-01', false),
    ];

    expect(selecionarSucessorCirculo(membros, '10')).toBeNull();
  });

  it('retorna null quando a lista está vazia', () => {
    expect(selecionarSucessorCirculo([], '10')).toBeNull();
  });

  it('não modifica a ordem original dos participantes', () => {
    const membros = [
      candidato('3', '30', '2026-03-01'),
      candidato('1', '10', '2026-01-01'),
      candidato('2', '20', '2026-02-01'),
    ];

    selecionarSucessorCirculo(membros, '99');

    expect(membros.map((membro) => membro.id)).toEqual([
      '3',
      '1',
      '2',
    ]);
  });
});
