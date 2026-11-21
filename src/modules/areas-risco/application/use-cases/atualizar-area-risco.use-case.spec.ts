
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { AtualizarAreaRiscoUseCase } from './atualizar-area-risco.use-case.js';

import type { AreaRisco } from '../../domain/entities/area-risco.entity.js';
import type { AreaRiscoRepository } from '../../domain/repositories/area-risco.repository.js';

describe('AtualizarAreaRiscoUseCase', () => {
  const repository = {
    listar: vi.fn<AreaRiscoRepository['listar']>(),
    buscarPorId: vi.fn<AreaRiscoRepository['buscarPorId']>(),
    buscarPorIdParaEdicao:
      vi.fn<AreaRiscoRepository['buscarPorIdParaEdicao']>(),
    criar: vi.fn<AreaRiscoRepository['criar']>(),
    atualizar: vi.fn<AreaRiscoRepository['atualizar']>(),
    excluir: vi.fn<AreaRiscoRepository['excluir']>(),
  };

  const useCase = new AtualizarAreaRiscoUseCase(repository);

  const area: AreaRisco = {
    id: '9007199254740993',
    nome: 'Praça teste',
    descricao: 'Iluminação reduzida',
    nivelRisco: 'ALTO',
    latitude: -23.55052,
    longitude: -46.633308,
    raioMetros: 100.25,
    tipoOrigem: 'COLABORATIVA',
    statusVerificacao: 'VERIFICADA',
    fonte: null,
    dataReferencia: null,
    verificadoEm: new Date('2026-01-02T10:00:00Z'),
    verificadoPorUsuarioId: '10',
    excluidoEm: null,
    dataCriacao: new Date('2026-01-01T12:00:00Z'),
    dataAtualizacao: new Date('2026-01-02T12:00:00Z'),
    usuarioId: '42',
  };

  const input = {
    id: area.id,
    usuarioId: '42',
    dados: { nome: 'Praça atualizada' },
  };

  beforeEach(() => {
    vi.resetAllMocks();
    repository.buscarPorIdParaEdicao.mockResolvedValue(area);
    repository.atualizar.mockResolvedValue({
      ...area,
      nome: 'Praça atualizada',
      statusVerificacao: 'PENDENTE',
      verificadoEm: null,
      verificadoPorUsuarioId: null,
    });
  });

  it('atualiza área pertencente ao usuário', async () => {
    const resultado = await useCase.executar(input);

    expect(repository.buscarPorIdParaEdicao)
      .toHaveBeenCalledExactlyOnceWith(area.id);

    expect(repository.atualizar).toHaveBeenCalledExactlyOnceWith(
      area.id,
      '42',
      { nome: 'Praça atualizada' },
    );

    expect(resultado).toMatchObject({
      nome: 'Praça atualizada',
      statusVerificacao: 'PENDENTE',
    });
  });

  it('permite editar área pendente', async () => {
    repository.buscarPorIdParaEdicao.mockResolvedValue({
      ...area,
      statusVerificacao: 'PENDENTE',
    });

    await expect(useCase.executar(input)).resolves.toBeDefined();
    expect(repository.atualizar).toHaveBeenCalledOnce();
  });

  it('retorna 404 para área inexistente', async () => {
    repository.buscarPorIdParaEdicao.mockResolvedValue(null);

    await expect(useCase.executar(input)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(repository.atualizar).not.toHaveBeenCalled();
  });

  it('impede edição de área oficial', async () => {
    repository.buscarPorIdParaEdicao.mockResolvedValue({
      ...area,
      tipoOrigem: 'OFICIAL',
    });

    await expect(useCase.executar(input)).rejects.toBeInstanceOf(
      ForbiddenException,
    );

    expect(repository.atualizar).not.toHaveBeenCalled();
  });

  it('impede edição por outro usuário', async () => {
    await expect(
      useCase.executar({ ...input, usuarioId: '99' }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(repository.atualizar).not.toHaveBeenCalled();
  });

  it('retorna 404 se a área ficar indisponível durante a atualização', async () => {
    repository.atualizar.mockResolvedValue(null);

    await expect(useCase.executar(input)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('propaga falhas de consulta do repositório', async () => {
    const erro = new Error('Falha SQL');

    repository.buscarPorIdParaEdicao.mockRejectedValue(erro);

    await expect(useCase.executar(input)).rejects.toBe(erro);
    expect(repository.atualizar).not.toHaveBeenCalled();
  });

  it('propaga falhas de atualização do repositório', async () => {
    const erro = new Error('Falha SQL');

    repository.atualizar.mockRejectedValue(erro);

    await expect(useCase.executar(input)).rejects.toBe(erro);
  });
});
