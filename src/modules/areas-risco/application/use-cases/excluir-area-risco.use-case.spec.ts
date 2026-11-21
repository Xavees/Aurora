
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { ExcluirAreaRiscoUseCase } from './excluir-area-risco.use-case.js';

import type { AreaRisco } from '../../domain/entities/area-risco.entity.js';
import type { AreaRiscoRepository } from '../../domain/repositories/area-risco.repository.js';

describe('ExcluirAreaRiscoUseCase', () => {
  /**
   * Simula o contrato completo do repositório.
   *
   * Nenhuma operação acessa o MariaDB neste teste.
   */
  const repository = {
    listar: vi.fn<AreaRiscoRepository['listar']>(),
    buscarPorId: vi.fn<AreaRiscoRepository['buscarPorId']>(),
    buscarPorIdParaEdicao:
      vi.fn<AreaRiscoRepository['buscarPorIdParaEdicao']>(),
    criar: vi.fn<AreaRiscoRepository['criar']>(),
    atualizar: vi.fn<AreaRiscoRepository['atualizar']>(),
    excluir: vi.fn<AreaRiscoRepository['excluir']>(),
  };

  const useCase = new ExcluirAreaRiscoUseCase(repository);

  const area: AreaRisco = {
    id: '9007199254740993',
    nome: 'Praça teste',
    descricao: 'Iluminação reduzida',
    nivelRisco: 'ALTO',
    latitude: -23.55052,
    longitude: -46.633308,
    raioMetros: 100.25,
    tipoOrigem: 'COLABORATIVA',
    statusVerificacao: 'PENDENTE',
    fonte: null,
    dataReferencia: null,
    verificadoEm: null,
    verificadoPorUsuarioId: null,
    excluidoEm: null,
    dataCriacao: new Date('2026-01-01T12:00:00Z'),
    dataAtualizacao: new Date('2026-01-02T12:00:00Z'),
    usuarioId: '42',
  };

  const input = {
    id: area.id,
    usuarioId: '42',
  };

  beforeEach(() => {
    vi.resetAllMocks();

    repository.buscarPorIdParaEdicao.mockResolvedValue(area);
    repository.excluir.mockResolvedValue(true);
  });

  it('permite ao autor excluir sua área colaborativa', async () => {
    await expect(useCase.executar(input)).resolves.toBeUndefined();

    expect(repository.buscarPorIdParaEdicao)
      .toHaveBeenCalledExactlyOnceWith(area.id);

    expect(repository.excluir).toHaveBeenCalledExactlyOnceWith(
      area.id,
      '42',
    );
  });

  it('permite excluir uma área verificada', async () => {
    repository.buscarPorIdParaEdicao.mockResolvedValue({
      ...area,
      statusVerificacao: 'VERIFICADA',
    });

    await expect(useCase.executar(input)).resolves.toBeUndefined();

    expect(repository.excluir).toHaveBeenCalledOnce();
  });

  it('permite excluir uma área rejeitada', async () => {
    repository.buscarPorIdParaEdicao.mockResolvedValue({
      ...area,
      statusVerificacao: 'REJEITADA',
    });

    await expect(useCase.executar(input)).resolves.toBeUndefined();

    expect(repository.excluir).toHaveBeenCalledOnce();
  });

  it('retorna 404 quando a área não existe', async () => {
    repository.buscarPorIdParaEdicao.mockResolvedValue(null);

    await expect(useCase.executar(input)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(repository.excluir).not.toHaveBeenCalled();
  });

  it('impede exclusão de áreas oficiais', async () => {
    repository.buscarPorIdParaEdicao.mockResolvedValue({
      ...area,
      tipoOrigem: 'OFICIAL',
    });

    await expect(useCase.executar(input)).rejects.toBeInstanceOf(
      ForbiddenException,
    );

    expect(repository.excluir).not.toHaveBeenCalled();
  });

  it('impede exclusão por outro usuário', async () => {
    await expect(
      useCase.executar({
        id: area.id,
        usuarioId: '99',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(repository.excluir).not.toHaveBeenCalled();
  });

  it('retorna 404 quando a exclusão não encontra uma área elegível', async () => {
    /**
     * Simula uma alteração concorrente:
     * a área existia na consulta inicial, mas deixou
     * de estar disponível durante a transação.
     */
    repository.excluir.mockResolvedValue(false);

    await expect(useCase.executar(input)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(repository.excluir).toHaveBeenCalledExactlyOnceWith(
      area.id,
      '42',
    );
  });

  it('propaga erro na consulta ao repositório', async () => {
    const erro = new Error('Falha SQL na consulta');

    repository.buscarPorIdParaEdicao.mockRejectedValue(erro);

    await expect(useCase.executar(input)).rejects.toBe(erro);

    expect(repository.excluir).not.toHaveBeenCalled();
  });

  it('propaga erro durante a exclusão', async () => {
    const erro = new Error('Falha SQL no UPDATE');

    repository.excluir.mockRejectedValue(erro);

    await expect(useCase.executar(input)).rejects.toBe(erro);

    expect(repository.excluir).toHaveBeenCalledOnce();
  });
});
