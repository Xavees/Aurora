import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BuscarCirculoUseCase } from './buscar-circulo.use-case.js';
import { ListarCirculosUseCase } from './listar-circulos.use-case.js';
import { ListarMembrosCirculoUseCase } from './listar-membros-circulo.use-case.js';
import type { CirculoRepository } from '../../domain/repositories/circulo.repository.js';
import type { MembroCirculoRepository } from '../../domain/repositories/membro-circulo.repository.js';

const circulo = {
  id: '11',
  nome: 'Família',
  codigoConvite: 'AABBCCDDEE',
  dataCriacao: new Date('2026-01-01'),
};
const membro = {
  id: '33',
  circuloId: '11',
  usuarioId: '22',
  funcao: 'MEMBRO' as const,
  dataEntrada: new Date('2026-01-01'),
};

describe('Consultas de círculos', () => {
  const circulos = {
    criar: vi.fn(),
    buscarPorId: vi.fn<CirculoRepository['buscarPorId']>(),
    buscarPorCodigoConvite: vi.fn(),
    listarPorUsuario: vi.fn<CirculoRepository['listarPorUsuario']>(),
    atualizar: vi.fn(),
    remover: vi.fn(),
  } satisfies CirculoRepository;
  const membros = {
    adicionar: vi.fn(),
    buscarPorUsuarioECirculo:
      vi.fn<MembroCirculoRepository['buscarPorUsuarioECirculo']>(),
    listarPorCirculo: vi.fn<MembroCirculoRepository['listarPorCirculo']>(),
    remover: vi.fn(),
    alterarFuncao: vi.fn(),
  } satisfies MembroCirculoRepository;
  const buscar = new BuscarCirculoUseCase(circulos, membros);
  const listar = new ListarCirculosUseCase(circulos);
  const listarMembros = new ListarMembrosCirculoUseCase(circulos, membros);

  beforeEach(() => vi.resetAllMocks());

  it('lista pelo ID do usuário autenticado', async () => {
    circulos.listarPorUsuario.mockResolvedValue([circulo]);
    await expect(listar.executar('22')).resolves.toEqual([circulo]);
    expect(circulos.listarPorUsuario).toHaveBeenCalledExactlyOnceWith('22');
  });

  it.each([
    ['busca', buscar],
    ['lista de membros', listarMembros],
  ] as const)('interrompe %s se o círculo não existe', async (_, caso) => {
    circulos.buscarPorId.mockResolvedValue(null);
    await expect(caso.executar('11', '22')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(circulos.buscarPorId).toHaveBeenCalledExactlyOnceWith('11');
    expect(membros.buscarPorUsuarioECirculo).not.toHaveBeenCalled();
    expect(membros.listarPorCirculo).not.toHaveBeenCalled();
  });

  it.each([
    ['busca', buscar, ForbiddenException],
    ['lista de membros', listarMembros, NotFoundException],
  ] as const)('restringe %s a participantes', async (_, caso, erro) => {
    circulos.buscarPorId.mockResolvedValue(circulo);
    membros.buscarPorUsuarioECirculo.mockResolvedValue(null);
    await expect(caso.executar('11', '22')).rejects.toBeInstanceOf(erro);
    expect(membros.buscarPorUsuarioECirculo).toHaveBeenCalledExactlyOnceWith(
      '22',
      '11',
    );
    expect(membros.listarPorCirculo).not.toHaveBeenCalled();
  });

  it('retorna o círculo para um participante', async () => {
    circulos.buscarPorId.mockResolvedValue(circulo);
    membros.buscarPorUsuarioECirculo.mockResolvedValue(membro);
    await expect(buscar.executar('11', '22')).resolves.toEqual(circulo);
  });

  it('lista os membros do círculo para um participante', async () => {
    circulos.buscarPorId.mockResolvedValue(circulo);
    membros.buscarPorUsuarioECirculo.mockResolvedValue(membro);
    membros.listarPorCirculo.mockResolvedValue([membro]);
    await expect(listarMembros.executar('11', '22')).resolves.toEqual([membro]);
    expect(membros.listarPorCirculo).toHaveBeenCalledExactlyOnceWith('11');
  });
});
