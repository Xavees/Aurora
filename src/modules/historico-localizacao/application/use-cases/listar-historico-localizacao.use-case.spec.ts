import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ListarHistoricoLocalizacaoUseCase } from './listar-historico-localizacao.use-case.js';
import type { HistoricoLocalizacaoRepository } from '../../domain/repositories/historico-localizacao.repository.js';

describe('ListarHistoricoLocalizacaoUseCase', () => {
  const repository = {
    listar: vi.fn<HistoricoLocalizacaoRepository['listar']>(),
    buscarPorId: vi.fn<HistoricoLocalizacaoRepository['buscarPorId']>(),
  };
  const useCase = new ListarHistoricoLocalizacaoUseCase(repository);
  beforeEach(() => vi.resetAllMocks());

  it('retorna registros e encaminha o usuário autenticado', async () => {
    const registro = {
      id: '9007199254740993',
      usuarioId: '42',
      dispositivoId: null,
      latitude: -23.5,
      longitude: -46.6,
      altitudeMetros: null,
      velocidadeKmh: null,
      satelites: null,
      bateria: 80,
      sos: false,
      dataHoraGps: new Date('2026-01-01T12:00:00Z'),
      recebidoEm: new Date('2026-01-01T12:00:01Z'),
    };
    const filtros = { usuarioId: '42', pagina: 1, limite: 20 };
    const resultado = {
      registros: [registro],
      total: 1,
      pagina: 1,
      limite: 20,
    };
    repository.listar.mockResolvedValue(resultado);
    expect(await useCase.executar(filtros)).toEqual(resultado);
    expect(repository.listar).toHaveBeenCalledExactlyOnceWith(filtros);
  });

  it('preserva resultado vazio', async () => {
    const resultado = { registros: [], total: 0, pagina: 1, limite: 20 };
    repository.listar.mockResolvedValue(resultado);
    expect(
      await useCase.executar({ usuarioId: '7', pagina: 1, limite: 20 }),
    ).toEqual(resultado);
  });

  it('encaminha período e paginação sem perder precisão ou alterar datas', async () => {
    const filtros = {
      usuarioId: '9007199254740993',
      dataInicio: new Date('2026-01-01T00:00:00Z'),
      dataFim: new Date('2026-01-02T00:00:00Z'),
      pagina: 3,
      limite: 2,
    };
    const resultado = { registros: [], total: 4, pagina: 3, limite: 2 };
    repository.listar.mockResolvedValue(resultado);
    expect(await useCase.executar(filtros)).toEqual(resultado);
    expect(repository.listar).toHaveBeenCalledExactlyOnceWith(filtros);
  });

  it('propaga o erro do repositório sem convertê-lo em lista vazia', async () => {
    const erro = new Error('Falha de leitura');
    repository.listar.mockRejectedValue(erro);
    await expect(
      useCase.executar({ usuarioId: '42', pagina: 1, limite: 20 }),
    ).rejects.toBe(erro);
  });
});
