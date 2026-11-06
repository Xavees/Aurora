import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictException } from '@nestjs/common';
import { QueryFailedError, Repository } from 'typeorm';

import { TypeOrmAuthRepository } from './typeorm-auth.repository.js';
import { UsuarioOrmEntity } from '../../../../../usuarios/infrastructure/persistence/typeorm/entities/usuario.orm-entity.js';

describe('TypeOrmAuthRepository', () => {
  let authRepository: TypeOrmAuthRepository;

  const repositoryMock = {
    findOne: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
  };

  const dadosCadastro = {
    nome: 'Usuario Teste',
    email: 'teste@example.com',
    senhaHash: 'hash-seguro',
  };

  beforeEach(() => {
    vi.resetAllMocks();

    authRepository = new TypeOrmAuthRepository(
      repositoryMock as unknown as Repository<UsuarioOrmEntity>,
    );
  });

  it('deve retornar as credenciais quando o e-mail existir', async () => {
    repositoryMock.findOne.mockResolvedValue({
      id: '1',
      email: dadosCadastro.email,
      senha: dadosCadastro.senhaHash,
    });

    const resultado = await authRepository.buscarPorEmail(dadosCadastro.email);

    expect(resultado).toEqual({
      id: '1',
      email: dadosCadastro.email,
      senhaHash: dadosCadastro.senhaHash,
    });

    expect(repositoryMock.findOne).toHaveBeenCalledWith({
      where: { email: dadosCadastro.email },
    });
  });

  it('deve retornar null quando o e-mail não existir', async () => {
    repositoryMock.findOne.mockResolvedValue(null);

    const resultado = await authRepository.buscarPorEmail(
      'inexistente@example.com',
    );

    expect(resultado).toBeNull();
  });

  it('deve cadastrar um usuário e retornar seu ID', async () => {
    const entidade = {
      ...dadosCadastro,
      senha: dadosCadastro.senhaHash,
      firebaseUid: null,
    };

    repositoryMock.create.mockReturnValue(entidade);
    repositoryMock.save.mockResolvedValue({
      ...entidade,
      id: '10',
    });

    const resultado = await authRepository.criarUsuario(dadosCadastro);

    expect(resultado).toBe('10');

    expect(repositoryMock.create).toHaveBeenCalledWith({
      nome: dadosCadastro.nome,
      email: dadosCadastro.email,
      senha: dadosCadastro.senhaHash,
      firebaseUid: null,
    });

    expect(repositoryMock.save).toHaveBeenCalledWith(entidade);
  });

  it('deve lançar ConflictException para ER_DUP_ENTRY', async () => {
    const erro = new QueryFailedError(
      'INSERT INTO usuario ...',
      [],
      Object.assign(new Error('Duplicate entry'), {
        code: 'ER_DUP_ENTRY',
      }),
    );

    repositoryMock.save.mockRejectedValue(erro);

    await expect(
      authRepository.criarUsuario(dadosCadastro),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('deve lançar ConflictException para errno 1062', async () => {
    const erro = new QueryFailedError(
      'INSERT INTO usuario ...',
      [],
      Object.assign(new Error('Duplicate entry'), {
        errno: 1062,
      }),
    );

    repositoryMock.save.mockRejectedValue(erro);

    await expect(
      authRepository.criarUsuario(dadosCadastro),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('deve propagar erros desconhecidos', async () => {
    const erro = new Error('Falha inesperada');

    repositoryMock.save.mockRejectedValue(erro);

    await expect(authRepository.criarUsuario(dadosCadastro)).rejects.toBe(erro);
  });

  it('deve propagar QueryFailedError que não seja duplicidade', async () => {
    const erro = new QueryFailedError(
      'INSERT INTO usuario ...',
      [],
      Object.assign(new Error('Database error'), {
        code: 'ER_BAD_FIELD_ERROR',
        errno: 1054,
      }),
    );

    repositoryMock.save.mockRejectedValue(erro);

    await expect(authRepository.criarUsuario(dadosCadastro)).rejects.toBe(erro);
  });
});
