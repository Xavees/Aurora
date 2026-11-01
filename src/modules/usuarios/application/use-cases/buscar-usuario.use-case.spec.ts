
import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { BuscarUsuarioUseCase } from './buscar-usuario.use-case.js';
import type { UsuarioRepository } from '../../domain/repositories/usuario.repository.js';

describe('BuscarUsuarioUseCase', () => {
  // Simula o repositório para testar o caso de uso isoladamente.
  const criarCenario = () => {
    const buscarPorId = vi.fn<UsuarioRepository['buscarPorId']>();

    const repository = {
      buscarPorId,
    } as unknown as UsuarioRepository;

    const useCase = new BuscarUsuarioUseCase(repository);

    return { useCase, buscarPorId };
  };

  it('deve retornar o usuário quando ele existir', async () => {
    const { useCase, buscarPorId } = criarCenario();

    const usuario = {
      id: '1',
      nome: 'Usuário Teste',
      email: 'teste@example.com',
      telefone: null,
      fotoUrl: null,
      tipoUsuario: 'COMUM',
    } as Awaited<ReturnType<UsuarioRepository['buscarPorId']>>;

    buscarPorId.mockResolvedValue(usuario);

    const resultado = await useCase.executar('1');

    expect(resultado).toEqual(usuario);
    expect(buscarPorId).toHaveBeenCalledExactlyOnceWith('1');
  });

  it('deve lançar NotFoundException quando o usuário não existir', async () => {
    const { useCase, buscarPorId } = criarCenario();

    buscarPorId.mockResolvedValue(null);

    await expect(useCase.executar('999')).rejects.toThrow(
      NotFoundException,
    );

    expect(buscarPorId).toHaveBeenCalledExactlyOnceWith('999');
  });
});
