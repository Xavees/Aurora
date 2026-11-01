
import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { DesativarUsuarioUseCase } from './desativar-usuario.use-case.js';
import type { UsuarioRepository } from '../../domain/repositories/usuario.repository.js';

describe('DesativarUsuarioUseCase', () => {
  // Criamos um cenário isolado para cada teste.
  // O mock substitui o acesso real ao banco de dados.
  const criarCenario = () => {
    const desativar = vi.fn<UsuarioRepository['desativar']>();

    const repository = {
      desativar,
    } as unknown as UsuarioRepository;

    // Injetamos manualmente o repositório simulado.
    const useCase = new DesativarUsuarioUseCase(repository);

    return { useCase, desativar };
  };

  it('deve concluir a desativação quando o usuário estiver ativo', async () => {
    const { useCase, desativar } = criarCenario();

    // Simula uma desativação realizada com sucesso.
    desativar.mockResolvedValue(true);

    const resultado = await useCase.executar('1');

    expect(resultado).toBeUndefined();
    expect(desativar).toHaveBeenCalledExactlyOnceWith('1');
  });

  it('deve lançar NotFoundException quando não houver usuário ativo', async () => {
    const { useCase, desativar } = criarCenario();

    // Simula um usuário inexistente ou já desativado.
    desativar.mockResolvedValue(false);

    await expect(useCase.executar('999')).rejects.toThrow(
      NotFoundException,
    );

    expect(desativar).toHaveBeenCalledExactlyOnceWith('999');
  });
});
