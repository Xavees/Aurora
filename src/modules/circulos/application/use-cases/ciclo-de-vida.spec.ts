import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AtualizarCirculoUseCase } from './atualizar-circulo.use-case.js';
import type { AtualizarCirculoTransacionalRepository } from '../../domain/repositories/atualizar-circulo-transacional.repository.js';
import { RemoverCirculoUseCase } from './remover-circulo.use-case.js';
import type { RemoverCirculoTransacionalRepository } from '../../domain/repositories/remover-circulo-transacional.repository.js';

const circulo = {
  id: '11',
  nome: 'Família',
  codigoConvite: 'AABBCCDDEE',
  dataCriacao: new Date('2026-01-01'),
};

describe('AtualizarCirculoUseCase', () => {
  const atualizar =
    vi.fn<AtualizarCirculoTransacionalRepository['atualizar']>();
  const caso = new AtualizarCirculoUseCase({ atualizar });

  beforeEach(() => atualizar.mockReset());

  it('encaminha os dados ao repositório e trata o sucesso', async () => {
    atualizar.mockResolvedValue({ status: 'CIRCULO_ATUALIZADO', circulo });
    await expect(
      caso.executar('11', '22', { nome: 'Família' }),
    ).resolves.toEqual(circulo);
    expect(atualizar).toHaveBeenCalledExactlyOnceWith('11', '22', {
      nome: 'Família',
    });
  });

  it.each([
    ['CIRCULO_NAO_ENCONTRADO', NotFoundException],
    ['USUARIO_NAO_AUTORIZADO', ForbiddenException],
  ] as const)('converte %s em erro de aplicação', async (status, erro) => {
    atualizar.mockResolvedValue({ status });
    await expect(
      caso.executar('11', '22', { nome: 'Família' }),
    ).rejects.toBeInstanceOf(erro);
  });
});

describe('RemoverCirculoUseCase', () => {
  const remover = vi.fn<RemoverCirculoTransacionalRepository['remover']>();
  const caso = new RemoverCirculoUseCase({ remover });

  beforeEach(() => remover.mockReset());

  it('encaminha os dados ao repositório e trata o sucesso', async () => {
    remover.mockResolvedValue('CIRCULO_REMOVIDO');
    await expect(caso.executar('11', '22')).resolves.toBeUndefined();
    expect(remover).toHaveBeenCalledExactlyOnceWith('11', '22');
  });

  it.each([
    ['CIRCULO_NAO_ENCONTRADO', NotFoundException],
    ['USUARIO_NAO_AUTORIZADO', ForbiddenException],
  ] as const)('converte %s em erro de aplicação', async (status, erro) => {
    remover.mockResolvedValue(status);
    await expect(caso.executar('11', '22')).rejects.toBeInstanceOf(erro);
  });
});
