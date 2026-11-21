
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CriarAreaRiscoUseCase } from './criar-area-risco.use-case.js';

import type {
  AreaRisco,
  DadosCriacaoAreaRisco,
} from '../../domain/entities/area-risco.entity.js';

import type { AreaRiscoRepository } from '../../domain/repositories/area-risco.repository.js';

describe('CriarAreaRiscoUseCase', () => {
  const repository = {
    listar: vi.fn<AreaRiscoRepository['listar']>(),
    buscarPorId: vi.fn<AreaRiscoRepository['buscarPorId']>(),
    criar: vi.fn<AreaRiscoRepository['criar']>(),
    buscarPorIdParaEdicao: vi.fn<AreaRiscoRepository['buscarPorIdParaEdicao']>(),
    atualizar: vi.fn<AreaRiscoRepository['atualizar']>(),
    excluir: vi.fn<AreaRiscoRepository['excluir']>(),
  };

  const useCase = new CriarAreaRiscoUseCase(repository);

  const dados: DadosCriacaoAreaRisco = {
    nome: 'Rua com iluminação inoperante',
    descricao: 'Postes apagados durante a noite',
    nivelRisco: 'MEDIO',
    latitude: -23.55052,
    longitude: -46.633308,
    raioMetros: 150,
    usuarioId: '42',
  };

  const areaCriada: AreaRisco = {
    ...dados,

    id: '9007199254740993',

    tipoOrigem: 'COLABORATIVA',
    statusVerificacao: 'PENDENTE',

    fonte: null,
    dataReferencia: null,
    verificadoEm: null,
    verificadoPorUsuarioId: null,
    excluidoEm: null,

    dataCriacao: new Date('2026-01-01T12:00:00Z'),
    dataAtualizacao: new Date('2026-01-01T12:00:00Z'),
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('encaminha os dados e retorna a área criada', async () => {
    repository.criar.mockResolvedValue(areaCriada);

    const resultado = await useCase.executar(dados);

    expect(repository.criar).toHaveBeenCalledExactlyOnceWith(dados);

    expect(resultado).toEqual(areaCriada);

    expect(resultado).toMatchObject({
      tipoOrigem: 'COLABORATIVA',
      statusVerificacao: 'PENDENTE',
      usuarioId: '42',
    });
  });

  it('preserva os campos opcionais nulos', async () => {
    const dadosComNulos: DadosCriacaoAreaRisco = {
      ...dados,
      descricao: null,
      nivelRisco: null,
      raioMetros: null,
    };

    const areaComNulos: AreaRisco = {
      ...areaCriada,
      ...dadosComNulos,
    };

    repository.criar.mockResolvedValue(areaComNulos);

    const resultado = await useCase.executar(dadosComNulos);

    expect(repository.criar).toHaveBeenCalledExactlyOnceWith(
      dadosComNulos,
    );

    expect(resultado).toMatchObject({
      descricao: null,
      nivelRisco: null,
      raioMetros: null,
    });
  });

  it('propaga erros do repositório sem mascará-los', async () => {
    const erro = new Error('Falha ao cadastrar área');

    repository.criar.mockRejectedValue(erro);

    await expect(useCase.executar(dados)).rejects.toBe(erro);

    expect(repository.criar).toHaveBeenCalledExactlyOnceWith(dados);
  });
});
