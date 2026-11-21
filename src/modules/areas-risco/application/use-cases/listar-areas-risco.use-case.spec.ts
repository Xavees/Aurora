import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ListarAreasRiscoUseCase } from './listar-areas-risco.use-case.js';
import type { AreaRiscoRepository } from '../../domain/repositories/area-risco.repository.js';
import { AreaRisco } from '../../domain/entities/area-risco.entity.js';
describe('ListarAreasRiscoUseCase', () => {
  
const area: AreaRisco = {
  id: '9007199254740993',
  nome: 'Praça teste',
  descricao: null,
  nivelRisco: 'ALTO',

  raioMetros: 100.25,
  latitude: -23.55052,
  longitude: -46.633308,

  // Registro colaborativo que passou pela moderação.
  tipoOrigem: 'COLABORATIVA',
  statusVerificacao: 'VERIFICADA',

  fonte: null,
  dataReferencia: null,

  verificadoEm: new Date('2026-01-02T10:00:00Z'),
  verificadoPorUsuarioId: '10',

  // O registro continua ativo.
  excluidoEm: null,

  dataCriacao: new Date('2026-01-01T12:00:00Z'),
  dataAtualizacao: new Date('2026-01-02T12:00:00Z'),

  usuarioId: '42',
};

  const repository = {
    listar: vi.fn<AreaRiscoRepository['listar']>(),
    buscarPorId: vi.fn<AreaRiscoRepository['buscarPorId']>(),
    criar: vi.fn<AreaRiscoRepository['criar']>(),
    buscarPorIdParaEdicao: vi.fn<AreaRiscoRepository['buscarPorIdParaEdicao']>(),
    atualizar: vi.fn<AreaRiscoRepository['atualizar']>(),
    excluir: vi.fn<AreaRiscoRepository['excluir']>(),
  };
  beforeEach(() => vi.resetAllMocks());
  const useCase = new ListarAreasRiscoUseCase(repository);
  it.each([{ registros: [] }, { registros: [area] }])(
    'retorna listagem sem alterar registros: %j',
    async ({ registros }) => {
      const filtros = { pagina: 1, limite: 20 };
      const resultado = { registros, total: registros.length, ...filtros };
      repository.listar.mockResolvedValue(resultado);
      expect(await useCase.executar(filtros)).toEqual(resultado);
      expect(repository.listar).toHaveBeenCalledExactlyOnceWith(filtros);
    },
  );
  it.each(['BAIXO', 'MEDIO', 'ALTO'] as const)(
    'encaminha filtro %s e paginação',
    async (nivelRisco) => {
      const filtros = { nivelRisco, pagina: 3, limite: 2 };
      const resultado = { registros: [area], total: 5, pagina: 3, limite: 2 };
      repository.listar.mockResolvedValue(resultado);
      expect(await useCase.executar(filtros)).toEqual(resultado);
      expect(repository.listar).toHaveBeenCalledExactlyOnceWith(filtros);
    },
  );
  it('propaga erro sem convertê-lo em lista vazia', async () => {
    const erro = new Error('Falha no repositório');
    repository.listar.mockRejectedValue(erro);
    await expect(useCase.executar({ pagina: 1, limite: 20 })).rejects.toBe(
      erro,
    );
  });
});
