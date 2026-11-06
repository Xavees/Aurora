
import { describe, it, expect, vi } from 'vitest';

import { CriarContatoUseCase } from './criar-contato.use-case.js';
import type { ContatoEmergenciaRepository } from '../../domain/repositories/contato-emergencia.repository.js';
import type { ContatoEmergencia } from '../../domain/entities/contato-emergencia.entity.js';

describe('CriarContatoUseCase', () => {
  it('deve criar um contato associado ao usuário correto', async () => {
    const dados = {
      nome: 'Maria',
      parentesco: 'Mãe',
      telefone: '11999999999',
      usuarioId: '1',
    };

    const contatoCriado: ContatoEmergencia = {
      id: '10',
      ...dados,
    };

    // Simula a operação de criação sem acessar o banco.
    const criarMock = vi.fn().mockResolvedValue(contatoCriado);

    const repository = {
      criar: criarMock,
    } as unknown as ContatoEmergenciaRepository;

    // Instancia o use case diretamente, injetando o repository falso.
    const useCase = new CriarContatoUseCase(repository);

    const resultado = await useCase.executar(dados);

    // Confirma que os dados foram encaminhados corretamente.
    expect(criarMock).toHaveBeenCalledExactlyOnceWith(dados);

    // Confirma que o use case devolve o contato criado.
    expect(resultado).toEqual(contatoCriado);
  });
});
