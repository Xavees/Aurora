
import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { RemoverContatoUseCase } from './remover-contato.use-case.js';
import type { ContatoEmergenciaRepository } from '../../domain/repositories/contato-emergencia.repository.js';

describe('RemoverContatoUseCase', () => {
  it('deve remover um contato do usuário corretamente', async () => {
    const contatoId = '10';
    const usuarioId = '1';

    // Simula uma remoção bem-sucedida.
    const removerMock = vi.fn().mockResolvedValue(true);

    const repository = {
      remover: removerMock,
    } as unknown as ContatoEmergenciaRepository;

    const useCase = new RemoverContatoUseCase(repository);

    const resultado = await useCase.executar(contatoId, usuarioId);

    // Confirma que o repository recebeu os IDs corretos.
    expect(removerMock).toHaveBeenCalledExactlyOnceWith(
      contatoId,
      usuarioId,
    );

    // O use case não deve retornar conteúdo após remover.
    expect(resultado).toBeUndefined();
  });

  it('deve lançar NotFoundException quando o contato não existir', async () => {
    const contatoId = '999';
    const usuarioId = '1';

    // Simula uma tentativa de remoção sem sucesso.
    const removerMock = vi.fn().mockResolvedValue(false);

    const repository = {
      remover: removerMock,
    } as unknown as ContatoEmergenciaRepository;

    const useCase = new RemoverContatoUseCase(repository);

    await expect(
      useCase.executar(contatoId, usuarioId),
    ).rejects.toThrow(NotFoundException);

    expect(removerMock).toHaveBeenCalledExactlyOnceWith(
      contatoId,
      usuarioId,
    );
  });
});
