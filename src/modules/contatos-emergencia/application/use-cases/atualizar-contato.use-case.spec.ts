
import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { AtualizarContatoUseCase } from './atualizar-contato.use-case.js';
import type { ContatoEmergencia } from '../../domain/entities/contato-emergencia.entity.js';
import type { ContatoEmergenciaRepository } from '../../domain/repositories/contato-emergencia.repository.js';

describe('AtualizarContatoUseCase', () => {
  it('deve atualizar um contato do usuário corretamente', async () => {
    const contatoId = '10';
    const usuarioId = '1';

    const dados = {
      nome: 'Maria Silva',
      parentesco: null,
    };

    const contatoAtualizado: ContatoEmergencia = {
      id: contatoId,
      nome: 'Maria Silva',
      parentesco: null,
      telefone: '11999999999',
      usuarioId,
    };

    // Simula uma atualização bem-sucedida no repository.
    const atualizarMock = vi.fn().mockResolvedValue(contatoAtualizado);

    const repository = {
      atualizar: atualizarMock,
    } as unknown as ContatoEmergenciaRepository;

    const useCase = new AtualizarContatoUseCase(repository);

    const resultado = await useCase.executar(
      contatoId,
      usuarioId,
      dados,
    );

    expect(atualizarMock).toHaveBeenCalledExactlyOnceWith(
      contatoId,
      usuarioId,
      dados,
    );

    expect(resultado).toEqual(contatoAtualizado);
  });

  it('deve lançar NotFoundException quando o contato não existir', async () => {
    const contatoId = '999';
    const usuarioId = '1';
    const dados = { nome: 'Maria Silva' };

    // Simula um contato não encontrado.
    const atualizarMock = vi.fn().mockResolvedValue(null);

    const repository = {
      atualizar: atualizarMock,
    } as unknown as ContatoEmergenciaRepository;

    const useCase = new AtualizarContatoUseCase(repository);

    await expect(
      useCase.executar(contatoId, usuarioId, dados),
    ).rejects.toThrow(NotFoundException);

    expect(atualizarMock).toHaveBeenCalledExactlyOnceWith(
      contatoId,
      usuarioId,
      dados,
    );
  });
});
