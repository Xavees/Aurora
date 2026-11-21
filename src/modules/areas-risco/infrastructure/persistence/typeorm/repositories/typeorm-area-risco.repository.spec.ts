import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IsNull } from 'typeorm';
import type { Repository } from 'typeorm';

import { TypeOrmAreaRiscoRepository } from './typeorm-area-risco.repository.js';
import { AreaRiscoOrmEntity } from '../entities/area-risco.orm-entity.js';
import type { DadosCriacaoAreaRisco } from '../../../../domain/entities/area-risco.entity.js';

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

  // Simula as operações executadas pelo EntityManager da transação.
  const transactionManager = {
    insert: vi.fn(),
    query: vi.fn(),
    findOne: vi.fn(),
    update: vi.fn(),
    findOneByOrFail: vi.fn(),
  };

  type TransactionCallback<T> = (
    manager: typeof transactionManager,
  ) => Promise<T>;

  const transaction = vi.fn(
    async <T>(callback: TransactionCallback<T>): Promise<T> =>
      callback(transactionManager),
  );

  const orm = {
    createQueryBuilder: vi.fn(),
    findOne: vi.fn(),
    manager: { transaction },
  };

  const repository = new TypeOrmAreaRiscoRepository(
    orm as unknown as Repository<AreaRiscoOrmEntity>,
  );

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

  const dadosCriacao: DadosCriacaoAreaRisco = {
    nome: 'Rua com iluminação inoperante',
    descricao: 'Postes apagados durante a noite',
    nivelRisco: 'MEDIO',
    latitude: -23.55052,
    longitude: -46.633308,
    raioMetros: 150,
    usuarioId: '42',
  };

  beforeEach(() => {
    vi.resetAllMocks();

    // Reestabelece o encadeamento do QueryBuilder após cada teste.
    query.where.mockReturnThis();
    query.andWhere.mockReturnThis();
    query.orderBy.mockReturnThis();
    query.addOrderBy.mockReturnThis();
    query.skip.mockReturnThis();
    query.take.mockReturnThis();

    orm.createQueryBuilder.mockReturnValue(query);
    orm.findOne.mockResolvedValue(null);
    query.getManyAndCount.mockResolvedValue([[], 0]);

    // O callback roda com o mesmo manager simulado.
    transaction.mockImplementation(async <T>(callback: TransactionCallback<T>) =>
      callback(transactionManager),
    );
    transactionManager.findOne.mockResolvedValue(null);
    transactionManager.update.mockResolvedValue({ affected: 1, raw: [], generatedMaps: [] });
    transactionManager.insert.mockResolvedValue({
      identifiers: [],
      generatedMaps: [],
      raw: {},
    });
    transactionManager.query.mockResolvedValue([
      { id: '9007199254740993' },
    ]);
    transactionManager.findOneByOrFail.mockResolvedValue({
      ...entidade,
      nome: dadosCriacao.nome,
      descricao: dadosCriacao.descricao,
      nivelRisco: dadosCriacao.nivelRisco,
      raioMetros: '150.00',
      statusVerificacao: 'PENDENTE',
      verificadoEm: null,
      verificadoPorUsuarioId: null,
    });
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

    // O mock testa a conversão, não a filtragem SQL (coberta pelos E2E).
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

    const result = await repository.listar({ pagina: 3, limite: 2 });

    expect(orm.createQueryBuilder).toHaveBeenCalledExactlyOnceWith('area');
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
    expect(query.addOrderBy).toHaveBeenCalledExactlyOnceWith('area.id', 'DESC');
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
      await repository.listar({ nivelRisco, pagina: 1, limite: 20 });
      expect(query.where).toHaveBeenCalledExactlyOnceWith(
        'area.statusVerificacao = :status',
        { status: 'VERIFICADA' },
      );
      expect(query.andWhere).toHaveBeenCalledWith('area.excluidoEm IS NULL');
      expect(query.andWhere).toHaveBeenCalledWith(
        'area.nivelRisco = :nivelRisco',
        { nivelRisco },
      );
      expect(query.andWhere).toHaveBeenCalledTimes(2);
    },
  );

  it('retorna primeira página vazia', async () => {
    expect(await repository.listar({ pagina: 1, limite: 20 })).toEqual({
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
    await expect(repository.listar({ pagina: 1, limite: 20 })).rejects.toBe(erro);
  });

  it('propaga erro da busca por ID', async () => {
    const erro = new Error('Falha SQL');
    orm.findOne.mockRejectedValue(erro);
    await expect(repository.buscarPorId('1')).rejects.toBe(erro);
  });

  it('cria área colaborativa como pendente em uma transação', async () => {
    const resultado = await repository.criar(dadosCriacao);

    expect(transaction).toHaveBeenCalledOnce();
    expect(transactionManager.insert).toHaveBeenCalledExactlyOnceWith(
      AreaRiscoOrmEntity,
      {
        nome: dadosCriacao.nome,
        descricao: dadosCriacao.descricao,
        nivelRisco: 'MEDIO',
        latitude: '-23.55052',
        longitude: '-46.633308',
        raioMetros: '150',
        usuarioId: '42',
        tipoOrigem: 'COLABORATIVA',
        statusVerificacao: 'PENDENTE',
        fonte: null,
        dataReferencia: null,
        verificadoEm: null,
        verificadoPorUsuarioId: null,
        excluidoEm: null,
      },
    );
    expect(transactionManager.query).toHaveBeenCalledExactlyOnceWith(
      'SELECT CAST(LAST_INSERT_ID() AS CHAR) AS id',
    );
    expect(transactionManager.findOneByOrFail).toHaveBeenCalledExactlyOnceWith(
      AreaRiscoOrmEntity,
      { id: '9007199254740993' },
    );
    expect(resultado).toMatchObject({
      id: '9007199254740993',
      nome: dadosCriacao.nome,
      nivelRisco: 'MEDIO',
      tipoOrigem: 'COLABORATIVA',
      statusVerificacao: 'PENDENTE',
      latitude: -23.55052,
      longitude: -46.633308,
      raioMetros: 150,
      usuarioId: '42',
    });
  });

  it('propaga erro quando o INSERT falha', async () => {
    const erro = new Error('Falha ao inserir área de risco');
    transactionManager.insert.mockRejectedValue(erro);
    await expect(repository.criar(dadosCriacao)).rejects.toBe(erro);
    expect(transaction).toHaveBeenCalledOnce();
    expect(transactionManager.insert).toHaveBeenCalledOnce();
    expect(transactionManager.query).not.toHaveBeenCalled();
    expect(transactionManager.findOneByOrFail).not.toHaveBeenCalled();
  });

  it('propaga erro quando não consegue recuperar o registro', async () => {
    const erro = new Error('Registro não encontrado');
    transactionManager.findOneByOrFail.mockRejectedValue(erro);
    await expect(repository.criar(dadosCriacao)).rejects.toBe(erro);
    expect(transactionManager.insert).toHaveBeenCalledOnce();
    expect(transactionManager.query).toHaveBeenCalledOnce();
    expect(transactionManager.findOneByOrFail).toHaveBeenCalledOnce();
  });

  it('rejeita ausência do ID gerado pelo banco', async () => {
    transactionManager.query.mockResolvedValue([]);
    await expect(repository.criar(dadosCriacao)).rejects.toThrow(
      'Não foi possível recuperar o ID da área criada.',
    );
    expect(transactionManager.insert).toHaveBeenCalledOnce();
    expect(transactionManager.query).toHaveBeenCalledOnce();
    expect(transactionManager.findOneByOrFail).not.toHaveBeenCalled();
  });


  it('busca área pendente para edição sem exigir verificação', async () => {
    const pendente = { ...entidade, statusVerificacao: 'PENDENTE' as const };
    orm.findOne.mockResolvedValue(pendente);

    const resultado = await repository.buscarPorIdParaEdicao(entidade.id);

    expect(orm.findOne).toHaveBeenCalledExactlyOnceWith({
      where: { id: entidade.id, excluidoEm: IsNull() },
    });
    expect(resultado).toMatchObject({
      id: entidade.id,
      statusVerificacao: 'PENDENTE',
    });
  });

  it('busca área rejeitada para edição', async () => {
    orm.findOne.mockResolvedValue({
      ...entidade,
      statusVerificacao: 'REJEITADA',
    });

    expect(await repository.buscarPorIdParaEdicao(entidade.id)).toMatchObject({
      statusVerificacao: 'REJEITADA',
    });
  });

  it('retorna null ao buscar área inexistente ou excluída para edição', async () => {
    expect(await repository.buscarPorIdParaEdicao('999')).toBeNull();
    expect(orm.findOne).toHaveBeenCalledExactlyOnceWith({
      where: { id: '999', excluidoEm: IsNull() },
    });
  });

  it('propaga falha SQL da busca para edição', async () => {
    const erro = new Error('Falha ao consultar área');
    orm.findOne.mockRejectedValue(erro);

    await expect(repository.buscarPorIdParaEdicao(entidade.id)).rejects.toBe(erro);
  });

  it('atualiza somente campos enviados e retorna área à moderação', async () => {
    transactionManager.findOne.mockResolvedValue(entidade);
    transactionManager.findOneByOrFail.mockResolvedValue({
      ...entidade,
      nome: 'Novo nome',
      latitude: '-23.60000000',
      raioMetros: '150.00',
      statusVerificacao: 'PENDENTE',
      verificadoEm: null,
      verificadoPorUsuarioId: null,
    });

    const resultado = await repository.atualizar(entidade.id, '42', {
      nome: 'Novo nome',
      latitude: -23.6,
      raioMetros: 150,
    });

    expect(transaction).toHaveBeenCalledOnce();
    expect(transactionManager.findOne).toHaveBeenCalledExactlyOnceWith(
      AreaRiscoOrmEntity,
      {
        where: {
          id: entidade.id,
          usuarioId: '42',
          tipoOrigem: 'COLABORATIVA',
          excluidoEm: IsNull(),
        },
        lock: { mode: 'pessimistic_write' },
      },
    );
    expect(transactionManager.update).toHaveBeenCalledExactlyOnceWith(
      AreaRiscoOrmEntity,
      entidade.id,
      {
        nome: 'Novo nome',
        latitude: '-23.6',
        raioMetros: '150',
        statusVerificacao: 'PENDENTE',
        verificadoEm: null,
        verificadoPorUsuarioId: null,
      },
    );
    expect(transactionManager.findOneByOrFail).toHaveBeenCalledExactlyOnceWith(
      AreaRiscoOrmEntity,
      { id: entidade.id },
    );
    expect(resultado).toMatchObject({
      id: entidade.id,
      nome: 'Novo nome',
      latitude: -23.6,
      raioMetros: 150,
      statusVerificacao: 'PENDENTE',
      verificadoEm: null,
      verificadoPorUsuarioId: null,
    });
    expect(resultado?.dataCriacao).toBeInstanceOf(Date);
  });

  it('permite limpar campos opcionais com null', async () => {
    transactionManager.findOne.mockResolvedValue(entidade);
    transactionManager.findOneByOrFail.mockResolvedValue({
      ...entidade,
      descricao: null,
      nivelRisco: null,
      raioMetros: null,
      statusVerificacao: 'PENDENTE',
    });

    const resultado = await repository.atualizar(entidade.id, '42', {
      descricao: null,
      nivelRisco: null,
      raioMetros: null,
    });

    expect(transactionManager.update).toHaveBeenCalledExactlyOnceWith(
      AreaRiscoOrmEntity,
      entidade.id,
      {
        descricao: null,
        nivelRisco: null,
        raioMetros: null,
        statusVerificacao: 'PENDENTE',
        verificadoEm: null,
        verificadoPorUsuarioId: null,
      },
    );
    expect(resultado).toMatchObject({
      descricao: null,
      nivelRisco: null,
      raioMetros: null,
    });
  });

  it('não altera registro quando a busca de edição não encontra área elegível', async () => {
    const resultado = await repository.atualizar(entidade.id, '999', {
      nome: 'Mudança indevida',
    });

    expect(resultado).toBeNull();
    expect(transactionManager.findOne).toHaveBeenCalledWith(
      AreaRiscoOrmEntity,
      expect.objectContaining({
        where: expect.objectContaining({ usuarioId: '999' }),
      }),
    );
    expect(transactionManager.update).not.toHaveBeenCalled();
    expect(transactionManager.findOneByOrFail).not.toHaveBeenCalled();
  });

  it('restringe a atualização a áreas colaborativas não excluídas', async () => {
    await repository.atualizar(entidade.id, '42', { nome: 'Atualização' });

    expect(transactionManager.findOne).toHaveBeenCalledExactlyOnceWith(
      AreaRiscoOrmEntity,
      {
        where: {
          id: entidade.id,
          usuarioId: '42',
          tipoOrigem: 'COLABORATIVA',
          excluidoEm: IsNull(),
        },
        lock: { mode: 'pessimistic_write' },
      },
    );
    // O banco aplica os filtros; o mock retorna null quando nenhum registro atende.
    expect(transactionManager.update).not.toHaveBeenCalled();
  });

  it('propaga erro ao atualizar e não busca a entidade depois da falha', async () => {
    const erro = new Error('Erro SQL no UPDATE');
    transactionManager.findOne.mockResolvedValue(entidade);
    transactionManager.update.mockRejectedValue(erro);

    await expect(
      repository.atualizar(entidade.id, '42', { nome: 'Teste' }),
    ).rejects.toBe(erro);

    expect(transaction).toHaveBeenCalledOnce();
    expect(transactionManager.findOneByOrFail).not.toHaveBeenCalled();
  });

  it('propaga falha ao recuperar o registro atualizado', async () => {
    const erro = new Error('Falha ao reler área');
    transactionManager.findOne.mockResolvedValue(entidade);
    transactionManager.findOneByOrFail.mockRejectedValue(erro);

    await expect(
      repository.atualizar(entidade.id, '42', { nome: 'Teste' }),
    ).rejects.toBe(erro);

    expect(transactionManager.update).toHaveBeenCalledOnce();
    expect(transactionManager.findOneByOrFail).toHaveBeenCalledOnce();
  });

  describe('excluir (soft delete)', () => {
    it('exclui logicamente a própria área colaborativa e retorna true', async () => {
      transactionManager.findOne.mockResolvedValue(entidade);

      const resultado = await repository.excluir(entidade.id, '42');

      expect(resultado).toBe(true);
      expect(transaction).toHaveBeenCalledOnce();
      expect(transactionManager.findOne).toHaveBeenCalledExactlyOnceWith(
        AreaRiscoOrmEntity,
        {
          where: {
            id: entidade.id,
            usuarioId: '42',
            tipoOrigem: 'COLABORATIVA',
            excluidoEm: IsNull(),
          },
          lock: { mode: 'pessimistic_write' },
        },
      );
      expect(transactionManager.update).toHaveBeenCalledExactlyOnceWith(
        AreaRiscoOrmEntity,
        entidade.id,
        { excluidoEm: expect.any(Date) },
      );
      // Soft delete não remove o registro nem o modifica via INSERT.
      expect(transactionManager.insert).not.toHaveBeenCalled();
    });

    it('grava data de exclusão válida e não altera status de moderação', async () => {
      transactionManager.findOne.mockResolvedValue(entidade);

      const inicio = Date.now();
      await repository.excluir(entidade.id, '42');
      const fim = Date.now();

      const alteracoes = transactionManager.update.mock.calls[0]?.[2] as {
        excluidoEm: Date;
      };
      expect(alteracoes.excluidoEm.getTime()).toBeGreaterThanOrEqual(inicio);
      expect(alteracoes.excluidoEm.getTime()).toBeLessThanOrEqual(fim);
      expect(Object.keys(alteracoes)).toEqual(['excluidoEm']);
    });

    it('retorna false para usuário diferente sem executar UPDATE', async () => {
      const resultado = await repository.excluir(entidade.id, '999');

      expect(resultado).toBe(false);
      expect(transactionManager.findOne).toHaveBeenCalledExactlyOnceWith(
        AreaRiscoOrmEntity,
        {
          where: {
            id: entidade.id,
            usuarioId: '999',
            tipoOrigem: 'COLABORATIVA',
            excluidoEm: IsNull(),
          },
          lock: { mode: 'pessimistic_write' },
        },
      );
      expect(transactionManager.update).not.toHaveBeenCalled();
    });

    it('exige origem colaborativa e não excluída para efetuar a exclusão', async () => {
      const resultado = await repository.excluir(entidade.id, '42');

      // O mock retorna null para uma área oficial ou excluída;
      // a filtragem efetiva será coberta em e2e com MariaDB.
      expect(resultado).toBe(false);
      expect(transactionManager.findOne).toHaveBeenCalledExactlyOnceWith(
        AreaRiscoOrmEntity,
        {
          where: {
            id: entidade.id,
            usuarioId: '42',
            tipoOrigem: 'COLABORATIVA',
            excluidoEm: IsNull(),
          },
          lock: { mode: 'pessimistic_write' },
        },
      );
      expect(transactionManager.update).not.toHaveBeenCalled();
    });

    it('retorna false para área inexistente sem executar UPDATE', async () => {
      const resultado = await repository.excluir('999999', '42');

      expect(resultado).toBe(false);
      expect(transactionManager.findOne).toHaveBeenCalledOnce();
      expect(transactionManager.update).not.toHaveBeenCalled();
    });

    it('não permite exclusão repetida quando a área já não está elegível', async () => {
      transactionManager.findOne
        .mockResolvedValueOnce(entidade)
        .mockResolvedValueOnce(null);

      expect(await repository.excluir(entidade.id, '42')).toBe(true);
      expect(await repository.excluir(entidade.id, '42')).toBe(false);
      expect(transactionManager.update).toHaveBeenCalledOnce();
      expect(transaction).toHaveBeenCalledTimes(2);
    });

    it('propaga erro SQL na consulta sem executar UPDATE', async () => {
      const erro = new Error('Falha ao bloquear área');
      transactionManager.findOne.mockRejectedValue(erro);

      await expect(repository.excluir(entidade.id, '42')).rejects.toBe(erro);
      expect(transactionManager.update).not.toHaveBeenCalled();
    });

    it('propaga erro SQL no UPDATE para que o TypeORM desfaça a transação', async () => {
      const erro = new Error('Falha ao gravar exclusão');
      transactionManager.findOne.mockResolvedValue(entidade);
      transactionManager.update.mockRejectedValue(erro);

      await expect(repository.excluir(entidade.id, '42')).rejects.toBe(erro);
      expect(transaction).toHaveBeenCalledOnce();
      expect(transactionManager.update).toHaveBeenCalledOnce();
      // O rollback efetivo é responsabilidade do TypeORM e será verificado em e2e.
    });
  });

});
