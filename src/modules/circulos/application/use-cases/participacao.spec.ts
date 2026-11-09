import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EntrarCirculoUseCase } from './entrar-circulo.use-case.js';
import type { EntrarCirculoTransacionalRepository } from '../../domain/repositories/entrar-circulo-transacional.repository.js';
import { SairCirculoUseCase } from './sair-circulo.use-case.js';
import type { SairCirculoTransacionalRepository } from '../../domain/repositories/sair-circulo-transacional.repository.js';

const membro = {
  id: '33',
  circuloId: '11',
  usuarioId: '22',
  funcao: 'MEMBRO' as const,
  dataEntrada: new Date('2026-01-01'),
};

describe('EntrarCirculoUseCase', () => {
  const entrar = vi.fn<EntrarCirculoTransacionalRepository['entrar']>();
  const caso = new EntrarCirculoUseCase({ entrar });

  beforeEach(() => entrar.mockReset());

  it('encaminha os dados ao repositório e trata o sucesso', async () => {
    entrar.mockResolvedValue({ status: 'MEMBRO_ADICIONADO', membro });
    await expect(caso.executar('AABBCCDDEE', '22')).resolves.toEqual(membro);
    expect(entrar).toHaveBeenCalledExactlyOnceWith('AABBCCDDEE', '22');
  });

  it.each([
    ['CIRCULO_NAO_ENCONTRADO', NotFoundException],
    ['USUARIO_JA_PARTICIPA', ConflictException],
    ['USUARIO_BLOQUEADO', ForbiddenException],
  ] as const)('converte %s em erro de aplicação', async (status, erro) => {
    entrar.mockResolvedValue({ status });
    await expect(caso.executar('AABBCCDDEE', '22')).rejects.toBeInstanceOf(
      erro,
    );
  });
});

describe('SairCirculoUseCase', () => {
  const sair = vi.fn<SairCirculoTransacionalRepository['sair']>();
  const caso = new SairCirculoUseCase({ sair });

  beforeEach(() => sair.mockReset());

  it.each([
    'MEMBRO_REMOVIDO',
    'ADMINISTRADOR_TRANSFERIDO',
    'CIRCULO_DESATIVADO',
  ] as const)('retorna %s', async (resultado) => {
    sair.mockResolvedValue(resultado);
    await expect(caso.executar('11', '22')).resolves.toEqual(resultado);
    expect(sair).toHaveBeenCalledExactlyOnceWith('11', '22');
  });

  it.each([
    ['CIRCULO_NAO_ENCONTRADO', NotFoundException],
    ['USUARIO_NAO_PARTICIPA', NotFoundException],
  ] as const)('converte %s em erro de aplicação', async (status, erro) => {
    sair.mockResolvedValue(status);
    await expect(caso.executar('11', '22')).rejects.toBeInstanceOf(erro);
  });
});
