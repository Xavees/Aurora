import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { BuscarHistoricoLocalizacaoPorIdUseCase } from './buscar-historico-localizacao-por-id.use-case.js';
import type { HistoricoLocalizacaoRepository } from '../../domain/repositories/historico-localizacao.repository.js';

describe('BuscarHistoricoLocalizacaoPorIdUseCase', () => {
  const repository = {
    listar: vi.fn<HistoricoLocalizacaoRepository['listar']>(),
    buscarPorId: vi.fn<HistoricoLocalizacaoRepository['buscarPorId']>(),
  };
  const useCase = new BuscarHistoricoLocalizacaoPorIdUseCase(repository);
  beforeEach(() => vi.resetAllMocks());
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

  it('retorna registro e consulta com os dois identificadores intactos', async () => {
    repository.buscarPorId.mockResolvedValue(registro);
    expect(await useCase.executar(registro.id, '42')).toEqual(registro);
    expect(repository.buscarPorId).toHaveBeenCalledExactlyOnceWith(
      registro.id,
      '42',
    );
  });

  it('lança NotFoundException quando não existe', async () => {
    repository.buscarPorId.mockResolvedValue(null);
    await expect(useCase.executar('99', '42')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('restringe a busca ao usuário informado, inclusive para ID de outro titular', async () => {
    repository.buscarPorId.mockImplementation(async (id, usuarioId) =>
      id === registro.id && usuarioId === registro.usuarioId ? registro : null,
    );
    await expect(useCase.executar(registro.id, '43')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repository.buscarPorId).toHaveBeenCalledExactlyOnceWith(
      registro.id,
      '43',
    );
  });

  it('propaga falha de infraestrutura sem mascarar como 404', async () => {
    const erro = new Error('Falha de leitura');
    repository.buscarPorId.mockRejectedValue(erro);
    await expect(useCase.executar('1', '42')).rejects.toBe(erro);
  });
});
