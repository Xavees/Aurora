
import { ConflictException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { CadastroUsuarioUseCase } from './cadastro-usuario.use-case.js';

import type { AuthRepository } from '../../domain/repositories/auth.repository.js';
import type { PasswordHasher } from '../services/password-hasher.interface.js';

describe('CadastroUsuarioUseCase', () => {
  // Cada teste recebe suas próprias dependências simuladas.
  // Isso mantém os testes isolados do banco e do Argon2id real.
  const criarCenario = () => {
    const buscarPorEmail = vi.fn<AuthRepository['buscarPorEmail']>();
    const criarUsuario = vi.fn<AuthRepository['criarUsuario']>();
    const hash = vi.fn<PasswordHasher['hash']>();

    const authRepository = {
      buscarPorEmail,
      criarUsuario,
    } as unknown as AuthRepository;

    const passwordHasher = {
      hash,
    } as unknown as PasswordHasher;

    const useCase = new CadastroUsuarioUseCase(
      authRepository,
      passwordHasher,
    );

    return { useCase, buscarPorEmail, criarUsuario, hash };
  };

  it('deve cadastrar um usuário e retornar seu ID e e-mail', async () => {
    const cenario = criarCenario();

    cenario.buscarPorEmail.mockResolvedValue(null);
    cenario.hash.mockResolvedValue('hash-simulado');
    cenario.criarUsuario.mockResolvedValue('1');

    const resultado = await cenario.useCase.executar({
      nome: 'Usuário Teste',
      email: 'teste@example.com',
      senha: 'senha-de-teste',
    });

    expect(resultado).toEqual({
      usuarioId: '1',
      email: 'teste@example.com',
    });

    expect(cenario.criarUsuario).toHaveBeenCalledExactlyOnceWith({
      nome: 'Usuário Teste',
      email: 'teste@example.com',
      senhaHash: 'hash-simulado',
    });
  });

  it('deve rejeitar um e-mail já cadastrado', async () => {
    const cenario = criarCenario();

    // Um resultado não nulo representa um usuário existente.
    const usuarioExistente = {
      id: '1',
      email: 'teste@example.com',
      senhaHash: 'hash-existente',
    } as NonNullable<
      Awaited<ReturnType<AuthRepository['buscarPorEmail']>>
    >;

    cenario.buscarPorEmail.mockResolvedValue(usuarioExistente);

    await expect(
      cenario.useCase.executar({
        nome: 'Outro Usuário',
        email: 'teste@example.com',
        senha: 'senha-de-teste',
      }),
    ).rejects.toThrow(ConflictException);

    // Não devemos gerar hash nem persistir dados duplicados.
    expect(cenario.hash).not.toHaveBeenCalled();
    expect(cenario.criarUsuario).not.toHaveBeenCalled();
  });

  it('deve normalizar o e-mail antes de consultar o banco', async () => {
    const cenario = criarCenario();

    cenario.buscarPorEmail.mockResolvedValue(null);
    cenario.hash.mockResolvedValue('hash-simulado');
    cenario.criarUsuario.mockResolvedValue('2');

    await cenario.useCase.executar({
      nome: 'Usuário Teste',
      email: '  TESTE@EXAMPLE.COM  ',
      senha: 'senha-de-teste',
    });

    expect(cenario.buscarPorEmail).toHaveBeenCalledExactlyOnceWith(
      'teste@example.com',
    );

    expect(cenario.criarUsuario).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'teste@example.com',
      }),
    );
  });

  it('deve remover espaços nas extremidades do nome', async () => {
    const cenario = criarCenario();

    cenario.buscarPorEmail.mockResolvedValue(null);
    cenario.hash.mockResolvedValue('hash-simulado');
    cenario.criarUsuario.mockResolvedValue('3');

    await cenario.useCase.executar({
      nome: '  Usuário Teste  ',
      email: 'teste@example.com',
      senha: 'senha-de-teste',
    });

    expect(cenario.criarUsuario).toHaveBeenCalledWith(
      expect.objectContaining({
        nome: 'Usuário Teste',
      }),
    );
  });

  it('deve gerar o hash e nunca persistir a senha original', async () => {
    const cenario = criarCenario();

    cenario.buscarPorEmail.mockResolvedValue(null);
    cenario.hash.mockResolvedValue('hash-seguro-simulado');
    cenario.criarUsuario.mockResolvedValue('4');

    await cenario.useCase.executar({
      nome: 'Usuário Teste',
      email: 'teste@example.com',
      senha: 'senha-original',
    });

    // Verifica se a senha original foi entregue ao serviço de hash.
    expect(cenario.hash).toHaveBeenCalledExactlyOnceWith(
      'senha-original',
    );

    // O repositório recebe somente o hash.
    expect(cenario.criarUsuario).toHaveBeenCalledExactlyOnceWith({
      nome: 'Usuário Teste',
      email: 'teste@example.com',
      senhaHash: 'hash-seguro-simulado',
    });
  });
});
