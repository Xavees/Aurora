
import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { AtualizarUsuarioUseCase } from './atualizar-usuario.use-case.js';

import type {
  UsuarioRepository,
  AtualizarUsuarioData,
} from '../../domain/repositories/usuario.repository.js';

describe('AtualizarUsuarioUseCase', () => {
  // Cria um repositório simulado para cada teste.
  // Assim, não dependemos do TypeORM nem do MariaDB.
  const criarCenario = () => {
    const atualizar = vi.fn<UsuarioRepository['atualizar']>();

    const repository = {
      atualizar,
    } as unknown as UsuarioRepository;

    // A dependência é fornecida manualmente.
    // Não precisamos iniciar o container de DI do NestJS.
    const useCase = new AtualizarUsuarioUseCase(repository);

    return { useCase, atualizar };
  };

  it('deve retornar o usuário após a atualização', async () => {
    const { useCase, atualizar } = criarCenario();

    const dados: AtualizarUsuarioData = {
      nome: 'Usuário Atualizado',
    };

    const usuarioAtualizado = {
      id: '1',
      nome: 'Usuário Atualizado',
      email: 'teste@example.com',
      telefone: null,
      fotoUrl: null,
      tipoUsuario: 'COMUM',
    } as NonNullable<
      Awaited<ReturnType<UsuarioRepository['atualizar']>>
    >;

    atualizar.mockResolvedValue(usuarioAtualizado);

    const resultado = await useCase.executar('1', dados);

    expect(resultado).toEqual(usuarioAtualizado);

    // Verifica se o caso de uso enviou os argumentos corretos.
    expect(atualizar).toHaveBeenCalledExactlyOnceWith('1', dados);
  });

  it('deve lançar NotFoundException quando o usuário não existir', async () => {
    const { useCase, atualizar } = criarCenario();

    const dados: AtualizarUsuarioData = {
      nome: 'Novo Nome',
    };

    atualizar.mockResolvedValue(null);

    await expect(useCase.executar('999', dados)).rejects.toThrow(
      NotFoundException,
    );

    expect(atualizar).toHaveBeenCalledExactlyOnceWith('999', dados);
  });
});
