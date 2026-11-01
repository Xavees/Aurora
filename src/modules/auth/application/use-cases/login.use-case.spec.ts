
import { UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { LoginUseCase } from './login.use-case.js';

import type { AuthRepository } from '../../domain/repositories/auth.repository.js';
import type { PasswordHasher } from '../services/password-hasher.interface.js';
import type { TokenService } from '../services/token-service.interface.js';

describe('LoginUseCase', () => {
  // Cada teste recebe dependências simuladas e independentes.
  // Nenhuma conexão com o banco ou serviço JWT real é necessária.
  const criarCenario = () => {
    const buscarPorEmail = vi.fn<AuthRepository['buscarPorEmail']>();
    const verificar = vi.fn<PasswordHasher['verificar']>();
    const gerarAccessToken = vi.fn<TokenService['gerarAccessToken']>();

    const authRepository = {
      buscarPorEmail,
    } as unknown as AuthRepository;

    const passwordHasher = {
      verificar,
    } as unknown as PasswordHasher;

    const tokenService = {
      gerarAccessToken,
    } as unknown as TokenService;

    const useCase = new LoginUseCase(
      authRepository,
      passwordHasher,
      tokenService,
    );

    return {
      useCase,
      buscarPorEmail,
      verificar,
      gerarAccessToken,
    };
  };

  // Criamos um usuário fictício compatível com o retorno
  // do repositório, sem utilizar dados reais.
  const criarUsuario = () => ({
    id: '1',
    email: 'teste@example.com',
    senhaHash: 'hash-ficticio',
  }) as NonNullable<
    Awaited<ReturnType<AuthRepository['buscarPorEmail']>>
  >;

  it('deve autenticar e retornar um token com credenciais válidas', async () => {
    const cenario = criarCenario();
    const usuario = criarUsuario();

    cenario.buscarPorEmail.mockResolvedValue(usuario);
    cenario.verificar.mockResolvedValue(true);
    cenario.gerarAccessToken.mockResolvedValue('jwt-simulado');

    const resultado = await cenario.useCase.executar({
      email: 'teste@example.com',
      senha: 'senha-de-teste',
    });

    expect(resultado).toEqual({
      access_token: 'jwt-simulado',
      token_type: 'Bearer',
      expires_in: 900,
    });

    expect(cenario.verificar).toHaveBeenCalledExactlyOnceWith(
      usuario.senhaHash,
      'senha-de-teste',
    );

    expect(cenario.gerarAccessToken).toHaveBeenCalledExactlyOnceWith({
      sub: usuario.id,
      email: usuario.email,
    });
  });

  it('deve rejeitar um e-mail não cadastrado', async () => {
    const cenario = criarCenario();

    cenario.buscarPorEmail.mockResolvedValue(null);

    await expect(
      cenario.useCase.executar({
        email: 'inexistente@example.com',
        senha: 'qualquer-senha',
      }),
    ).rejects.toThrow(UnauthorizedException);

    expect(cenario.verificar).not.toHaveBeenCalled();
    expect(cenario.gerarAccessToken).not.toHaveBeenCalled();
  });

  it('deve rejeitar um usuário sem senha cadastrada', async () => {
    const cenario = criarCenario();

    const usuario = {
      ...criarUsuario(),
      senhaHash: null,
    };

    cenario.buscarPorEmail.mockResolvedValue(usuario);

    await expect(
      cenario.useCase.executar({
        email: usuario.email,
        senha: 'qualquer-senha',
      }),
    ).rejects.toThrow(UnauthorizedException);

    expect(cenario.verificar).not.toHaveBeenCalled();
    expect(cenario.gerarAccessToken).not.toHaveBeenCalled();
  });

  it('deve rejeitar uma senha incorreta', async () => {
    const cenario = criarCenario();

    cenario.buscarPorEmail.mockResolvedValue(criarUsuario());
    cenario.verificar.mockResolvedValue(false);

    await expect(
      cenario.useCase.executar({
        email: 'teste@example.com',
        senha: 'senha-incorreta',
      }),
    ).rejects.toThrow(UnauthorizedException);

    expect(cenario.gerarAccessToken).not.toHaveBeenCalled();
  });

  it('deve normalizar o e-mail antes de consultar o repositório', async () => {
    const cenario = criarCenario();

    cenario.buscarPorEmail.mockResolvedValue(criarUsuario());
    cenario.verificar.mockResolvedValue(true);
    cenario.gerarAccessToken.mockResolvedValue('jwt-simulado');

    await cenario.useCase.executar({
      email: '  TESTE@EXAMPLE.COM  ',
      senha: 'senha-de-teste',
    });

    expect(cenario.buscarPorEmail).toHaveBeenCalledExactlyOnceWith(
      'teste@example.com',
    );
  });
});
