import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Repository } from 'typeorm';
import { TypeOrmHistoricoLocalizacaoRepository } from './typeorm-historico-localizacao.repository.js';
import { HistoricoLocalizacaoOrmEntity } from '../entities/historico-localizacao.orm-entity.js';

describe('TypeOrmHistoricoLocalizacaoRepository', () => {
  const query = {
    where: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    addOrderBy: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    take: vi.fn().mockReturnThis(),
    getManyAndCount: vi.fn(),
  };
  const orm = { createQueryBuilder: vi.fn(), findOne: vi.fn() };
  const repository = new TypeOrmHistoricoLocalizacaoRepository(
    orm as unknown as Repository<HistoricoLocalizacaoOrmEntity>,
  );
  const entidade: HistoricoLocalizacaoOrmEntity = {
    id: '9007199254740993',
    usuarioId: '42',
    dispositivoId: null,
    latitude: '-23.5505200',
    longitude: '-46.6333080',
    altitudeMetros: '760.25',
    velocidadeKmh: '12.50',
    satelites: 7,
    bateria: 80,
    sos: 1,
    dataHoraGps: new Date('2026-01-01T12:00:00Z'),
    recebidoEm: new Date('2026-01-01T12:00:01Z'),
    ipOrigem: '192.0.2.1',
  };
  beforeEach(() => {
    vi.clearAllMocks();
    orm.createQueryBuilder.mockReturnValue(query);
    query.getManyAndCount.mockResolvedValue([[], 0]);
    orm.findOne.mockResolvedValue(null);
  });

  it('mapeia entidade completa, converte DECIMAL e SOS e omite IP', async () => {
    orm.findOne.mockResolvedValue(entidade);
    expect(await repository.buscarPorId(entidade.id, '42')).toEqual({
      id: entidade.id,
      usuarioId: '42',
      dispositivoId: null,
      latitude: -23.55052,
      longitude: -46.633308,
      altitudeMetros: 760.25,
      velocidadeKmh: 12.5,
      satelites: 7,
      bateria: 80,
      sos: true,
      dataHoraGps: entidade.dataHoraGps,
      recebidoEm: entidade.recebidoEm,
    });
    expect(orm.findOne).toHaveBeenCalledExactlyOnceWith({
      where: { id: entidade.id, usuarioId: '42' },
    });
  });

  it('preserva nulos e converte SOS zero em false', async () => {
    orm.findOne.mockResolvedValue({
      ...entidade,
      altitudeMetros: null,
      velocidadeKmh: null,
      satelites: null,
      bateria: null,
      sos: 0,
    });
    expect(await repository.buscarPorId('1', '42')).toMatchObject({
      altitudeMetros: null,
      velocidadeKmh: null,
      satelites: null,
      bateria: null,
      sos: false,
    });
  });

  it('preserva zero nas coordenadas e medidas opcionais', async () => {
    orm.findOne.mockResolvedValue({
      ...entidade,
      latitude: '0.0000000',
      longitude: '0.0000000',
      altitudeMetros: '0.00',
      velocidadeKmh: '0.00',
    });
    expect(await repository.buscarPorId('1', '42')).toMatchObject({
      latitude: 0,
      longitude: 0,
      altitudeMetros: 0,
      velocidadeKmh: 0,
    });
  });

  it('retorna null sem correspondência de ID e usuário', async () => {
    expect(await repository.buscarPorId('9', '43')).toBeNull();
    expect(orm.findOne).toHaveBeenCalledExactlyOnceWith({
      where: { id: '9', usuarioId: '43' },
    });
  });

  it('lista com escopo, ordenação decrescente estável e total independente da página', async () => {
    query.getManyAndCount.mockResolvedValue([[entidade], 7]);
    const result = await repository.listar({
      usuarioId: '42',
      pagina: 3,
      limite: 2,
    });
    expect(orm.createQueryBuilder).toHaveBeenCalledExactlyOnceWith('historico');
    expect(query.where).toHaveBeenCalledExactlyOnceWith(
      'historico.usuarioId = :usuarioId',
      { usuarioId: '42' },
    );
    expect(query.orderBy).toHaveBeenCalledExactlyOnceWith(
      'historico.dataHoraGps',
      'DESC',
    );
    expect(query.addOrderBy).toHaveBeenCalledExactlyOnceWith(
      'historico.id',
      'DESC',
    );
    expect(query.skip).toHaveBeenCalledExactlyOnceWith(4);
    expect(query.take).toHaveBeenCalledExactlyOnceWith(2);
    expect(query.andWhere).not.toHaveBeenCalled();
    expect(result).toMatchObject({ total: 7, pagina: 3, limite: 2 });
    expect(result.registros).toHaveLength(1);
    expect(result.registros[0]).toMatchObject({
      id: entidade.id,
      latitude: -23.55052,
      sos: true,
    });
  });

  it.each(['inicio', 'fim', 'ambos'] as const)(
    'aplica somente os filtros presentes: %s',
    async (periodo) => {
      const inicio = new Date('2026-01-01T00:00:00Z');
      const fim = new Date('2026-01-02T00:00:00Z');
      await repository.listar({
        usuarioId: '42',
        pagina: 1,
        limite: 20,
        dataInicio: periodo !== 'fim' ? inicio : undefined,
        dataFim: periodo !== 'inicio' ? fim : undefined,
      });
      expect(query.andWhere).toHaveBeenCalledTimes(periodo === 'ambos' ? 2 : 1);
      if (periodo !== 'fim')
        expect(query.andWhere).toHaveBeenCalledWith(
          'historico.dataHoraGps >= :dataInicio',
          { dataInicio: inicio },
        );
      if (periodo !== 'inicio')
        expect(query.andWhere).toHaveBeenCalledWith(
          'historico.dataHoraGps <= :dataFim',
          { dataFim: fim },
        );
    },
  );

  it('retorna primeira página vazia com total zero', async () => {
    expect(
      await repository.listar({ usuarioId: '42', pagina: 1, limite: 20 }),
    ).toEqual({ registros: [], total: 0, pagina: 1, limite: 20 });
    expect(query.skip).toHaveBeenCalledWith(0);
  });

  it('propaga erro da consulta', async () => {
    const erro = new Error('Falha SQL');
    query.getManyAndCount.mockRejectedValue(erro);
    await expect(
      repository.listar({ usuarioId: '42', pagina: 1, limite: 20 }),
    ).rejects.toBe(erro);
  });
});
