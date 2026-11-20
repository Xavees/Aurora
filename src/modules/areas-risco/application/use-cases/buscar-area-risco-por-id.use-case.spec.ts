import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { BuscarAreaRiscoPorIdUseCase } from './buscar-area-risco-por-id.use-case.js';
import type { AreaRiscoRepository } from '../../domain/repositories/area-risco.repository.js';
import { AreaRisco } from '../../domain/entities/area-risco.entity.js';
describe('BuscarAreaRiscoPorIdUseCase', () => {

const area: AreaRisco = {
  id: '9007199254740993',
  nome: 'Praça teste',
  descricao: null,
  nivelRisco: 'ALTO',

  raioMetros: 100.25,
  latitude: -23.55052,
  longitude: -46.633308,

  // Área colaborativa avaliada pela moderação.
  tipoOrigem: 'COLABORATIVA',
  statusVerificacao: 'VERIFICADA',

  fonte: null,
  dataReferencia: null,

  verificadoEm: new Date('2026-01-02T10:00:00Z'),
  verificadoPorUsuarioId: '10',

  // O registro não foi excluído logicamente.
  excluidoEm: null,

  dataCriacao: new Date('2026-01-01T12:00:00Z'),
  dataAtualizacao: new Date('2026-01-02T12:00:00Z'),

  usuarioId: '42',
};

  const repository = {
    listar: vi.fn<AreaRiscoRepository['listar']>(),
    buscarPorId: vi.fn<AreaRiscoRepository['buscarPorId']>(),
  };
  beforeEach(() => vi.resetAllMocks());
  const useCase = new BuscarAreaRiscoPorIdUseCase(repository);
  it('retorna área e preserva ID acima do limite seguro de Number', async () => {
    repository.buscarPorId.mockResolvedValue(area);
    expect(await useCase.executar(area.id)).toEqual(area);
    expect(repository.buscarPorId).toHaveBeenCalledExactlyOnceWith(area.id);
  });
  it('lança NotFoundException para registro ausente', async () => {
    repository.buscarPorId.mockResolvedValue(null);
    await expect(useCase.executar('1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repository.buscarPorId).toHaveBeenCalledExactlyOnceWith('1');
  });
  it('propaga erro de infraestrutura sem mascará-lo como 404', async () => {
    const erro = new Error('Falha de leitura');
    repository.buscarPorId.mockRejectedValue(erro);
    await expect(useCase.executar('1')).rejects.toBe(erro);
  });
});
