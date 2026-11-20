
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IsNull } from 'typeorm';
import type { Repository } from 'typeorm';

import { TypeOrmAreaRiscoRepository } from './typeorm-area-risco.repository.js';
import type { AreaRiscoOrmEntity } from '../entities/area-risco.orm-entity.js';

describe('TypeOrmAreaRiscoRepository', () => {
  const query = {
    where: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    addOrderBy: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    take: vi.fn().mockReturnThis(),
    getManyAndCount: vi.fn(),
  };

  const orm = {
    createQueryBuilder: vi.fn(),
    findOne: vi.fn(),
  };

  const repository = new TypeOrmAreaRiscoRepository(
    orm as unknown as Repository<AreaRiscoOrmEntity>,
  );

  // Representa uma área colaborativa aprovada e ativa.
  const entidade: AreaRiscoOrmEntity = {
    id: '9007199254740993',
    nome: 'Praça teste',
    descricao: 'Iluminação reduzida',
    nivelRisco: 'ALTO',

    raioMetros: '100.25',
    latitude: '-23.55052000',
    longitude: '-46.63330800',

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

  beforeEach(() => {
    vi.clearAllMocks();

    orm.createQueryBuilder.mockReturnValue(query);
    orm.findOne.mockResolvedValue(null);
    query.getManyAndCount.mockResolvedValue([[], 0]);
  });

  it('mapeia todos os campos e converte DECIMAL para número', async () => {
    orm.findOne.mockResolvedValue(entidade);

    expect(await repository.buscarPorId(entidade.id)).toEqual({
      id: entidade.id,
      nome: entidade.nome,
      descricao: entidade.descricao,
      nivelRisco: 'ALTO',

      raioMetros: 100.25,
      latitude: -23.55052,
      longitude: -46.633308,

      tipoOrigem: 'COLABORATIVA',
      statusVerificacao: 'VERIFICADA',
      fonte: null,
      dataReferencia: null,
      verificadoEm: entidade.verificadoEm,
      verificadoPorUsuarioId: '10',
      excluidoEm: null,

      dataCriacao: entidade.dataCriacao,
      dataAtualizacao: entidade.dataAtualizacao,
      usuarioId: '42',
    });

    // A busca individual deve restringir a consulta
    // a áreas verificadas e não excluídas.
    expect(orm.findOne).toHaveBeenCalledExactlyOnceWith({
      where: {
        id: entidade.id,
        statusVerificacao: 'VERIFICADA',
        excluidoEm: IsNull(),
      },
    });
  });

  it('preserva todos os campos opcionais nulos', async () => {
    orm.findOne.mockResolvedValue({
      ...entidade,
      descricao: null,
      nivelRisco: null,
      raioMetros: null,
      usuarioId: null,
      tipoOrigem: null,
      statusVerificacao: null,
      fonte: null,
      dataReferencia: null,
      verificadoEm: null,
      verificadoPorUsuarioId: null,
      excluidoEm: null,
    });

    // Testa apenas o mapeamento, utilizando uma entidade
    // simulada. O teste e2e validará a filtragem real no banco.
    expect(await repository.buscarPorId('1')).toMatchObject({
      descricao: null,
      nivelRisco: null,
      raioMetros: null,
      usuarioId: null,
      tipoOrigem: null,
      statusVerificacao: null,
      fonte: null,
      dataReferencia: null,
      verificadoEm: null,
      verificadoPorUsuarioId: null,
      excluidoEm: null,
    });
  });

  it('preserva zeros e normaliza identificadores numéricos', async () => {
    orm.findOne.mockResolvedValue({
      ...entidade,
      id: 1,
      usuarioId: 42,
      verificadoPorUsuarioId: 10,
      latitude: '0.00000000',
      longitude: '0.00000000',
      raioMetros: '0.00',
    });

    expect(await repository.buscarPorId('1')).toMatchObject({
      id: '1',
      usuarioId: '42',
      verificadoPorUsuarioId: '10',
      latitude: 0,
      longitude: 0,
      raioMetros: 0,
    });
  });

  it('retorna null quando não há área visível', async () => {
    expect(await repository.buscarPorId('9')).toBeNull();

    expect(orm.findOne).toHaveBeenCalledExactlyOnceWith({
      where: {
        id: '9',
        statusVerificacao: 'VERIFICADA',
        excluidoEm: IsNull(),
      },
    });
  });

  it('lista, mapeia e ordena com total independente da página', async () => {
    query.getManyAndCount.mockResolvedValue([[entidade], 7]);

    const result = await repository.listar({
      pagina: 3,
      limite: 2,
    });

    expect(orm.createQueryBuilder).toHaveBeenCalledExactlyOnceWith('area');

    // Garante que a regra de visibilidade esteja
    // presente na consulta paginada.
    expect(query.where).toHaveBeenCalledExactlyOnceWith(
      'area.statusVerificacao = :status',
      { status: 'VERIFICADA' },
    );

    expect(query.andWhere).toHaveBeenCalledExactlyOnceWith(
      'area.excluidoEm IS NULL',
    );

    expect(query.orderBy).toHaveBeenCalledExactlyOnceWith(
      'area.dataCriacao',
      'DESC',
    );

    expect(query.addOrderBy).toHaveBeenCalledExactlyOnceWith(
      'area.id',
      'DESC',
    );

    expect(query.skip).toHaveBeenCalledExactlyOnceWith(4);
    expect(query.take).toHaveBeenCalledExactlyOnceWith(2);

    expect(result).toEqual({
      registros: [
        {
          ...entidade,
          raioMetros: 100.25,
          latitude: -23.55052,
          longitude: -46.633308,
        },
      ],
      total: 7,
      pagina: 3,
      limite: 2,
    });
  });

  it.each(['BAIXO', 'MEDIO', 'ALTO'] as const)(
    'parametriza filtro %s mantendo as restrições de visibilidade',
    async (nivelRisco) => {
      await repository.listar({
        nivelRisco,
        pagina: 1,
        limite: 20,
      });

      expect(query.where).toHaveBeenCalledExactlyOnceWith(
        'area.statusVerificacao = :status',
        { status: 'VERIFICADA' },
      );

      expect(query.andWhere).toHaveBeenCalledWith(
        'area.excluidoEm IS NULL',
      );

      expect(query.andWhere).toHaveBeenCalledWith(
        'area.nivelRisco = :nivelRisco',
        { nivelRisco },
      );

      expect(query.andWhere).toHaveBeenCalledTimes(2);
    },
  );

  it('retorna primeira página vazia', async () => {
    expect(
      await repository.listar({ pagina: 1, limite: 20 }),
    ).toEqual({
      registros: [],
      total: 0,
      pagina: 1,
      limite: 20,
    });

    expect(query.skip).toHaveBeenCalledWith(0);
  });

  it('propaga erro de listagem', async () => {
    const erro = new Error('Falha SQL');

    query.getManyAndCount.mockRejectedValue(erro);

    await expect(
      repository.listar({ pagina: 1, limite: 20 }),
    ).rejects.toBe(erro);
  });

  it('propaga erro da busca por ID', async () => {
    const erro = new Error('Falha SQL');

    orm.findOne.mockRejectedValue(erro);

    await expect(repository.buscarPorId('1')).rejects.toBe(erro);
  });
});
