
import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { DesativarUsuarioUseCase } from './desativar-usuario.use-case.js';

import type { DesativarUsuarioTransacionalRepository } from '../../domain/repositories/desativar-usuario-transacional.repository.js';

describe('DesativarUsuarioUseCase', () => {
  const criarCenario = () => {
    const desativar =
      vi.fn<DesativarUsuarioTransacionalRepository['desativar']>();

    const repository: DesativarUsuarioTransacionalRepository = {
      desativar,
    };

    const useCase = new DesativarUsuarioUseCase(repository);

    return { useCase, desativar };
  };

  it('deve concluir a desativação quando o usuário estiver ativo', async () => {
    const { useCase, desativar } = criarCenario();

    desativar.mockResolvedValue(true);

    const resultado = await useCase.executar('1');

    expect(resultado).toBeUndefined();
    expect(desativar).toHaveBeenCalledExactlyOnceWith('1');
  });

  it('deve lançar NotFoundException quando não houver usuário ativo', async () => {
    const { useCase, desativar } = criarCenario();

    desativar.mockResolvedValue(false);

    await expect(useCase.executar('999')).rejects.toThrow(
      NotFoundException,
    );

    expect(desativar).toHaveBeenCalledExactlyOnceWith('999');
  });
});
