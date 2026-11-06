
import { describe, expect, it, vi } from 'vitest';

import { ListarContatosUseCase } from './listar-contatos.use-case.js';
import type { ContatoEmergencia } from '../../domain/entities/contato-emergencia.entity.js';
import type { ContatoEmergenciaRepository } from '../../domain/repositories/contato-emergencia.repository.js';

describe('ListarContatosUseCase', () => {
  it('deve listar os contatos do usuário informado', async () => {
    const usuarioId = '1';

    const contatos: ContatoEmergencia[] = [
      {
        id: '10',
        nome: 'Maria',
        parentesco: 'Mãe',
        telefone: '11999999999',
        usuarioId,
      },
      {
        id: '11',
        nome: 'João',
        parentesco: 'Pai',
        telefone: '11988888888',
        usuarioId,
      },
    ];

    // Simula o retorno do repository sem consultar o banco.
    const listarMock = vi.fn().mockResolvedValue(contatos);

    const repository = {
      listarPorUsuario: listarMock,
    } as unknown as ContatoEmergenciaRepository;

    const useCase = new ListarContatosUseCase(repository);

    const resultado = await useCase.executar(usuarioId);

    // Verifica se o ID correto foi enviado ao repository.
    expect(listarMock).toHaveBeenCalledExactlyOnceWith(usuarioId);

    // Verifica se o resultado foi devolvido corretamente.
    expect(resultado).toEqual(contatos);
  });

  it('deve retornar um array vazio quando não houver contatos', async () => {
    const usuarioId = '2';

    const listarMock = vi.fn().mockResolvedValue([]);

    const repository = {
      listarPorUsuario: listarMock,
    } as unknown as ContatoEmergenciaRepository;

    const useCase = new ListarContatosUseCase(repository);

    const resultado = await useCase.executar(usuarioId);

    expect(listarMock).toHaveBeenCalledExactlyOnceWith(usuarioId);
    expect(resultado).toEqual([]);
  });
});
