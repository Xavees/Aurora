import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CriarCirculoUseCase } from './criar-circulo.use-case.js';
import { RenovarCodigoConviteUseCase } from './renovar-codigo-convite.use-case.js';
import type { CirculoRepository } from '../../domain/repositories/circulo.repository.js';
import type { CriarCirculoTransacionalRepository } from '../../domain/repositories/criar-circulo-transacional.repository.js';
import type { RenovarCodigoConviteTransacionalRepository } from '../../domain/repositories/renovar-codigo-convite-transacional.repository.js';

const circulo = {
  id: '11',
  nome: 'Família',
  codigoConvite: 'AABBCCDDEE',
  dataCriacao: new Date('2026-01-01'),
};
const dados = { nome: 'Família', criadorId: '22' };
const formatoCodigo = /^[A-F0-9]{10}$/;

describe('CriarCirculoUseCase', () => {
  const buscarPorCodigoConvite =
    vi.fn<CirculoRepository['buscarPorCodigoConvite']>();
  const criarComAdministrador =
    vi.fn<CriarCirculoTransacionalRepository['criarComAdministrador']>();
  const caso = new CriarCirculoUseCase(
    {
      buscarPorCodigoConvite,
      criar: vi.fn(),
      buscarPorId: vi.fn(),
      listarPorUsuario: vi.fn(),
      atualizar: vi.fn(),
      remover: vi.fn(),
    },
    { criarComAdministrador },
  );

  beforeEach(() => {
    buscarPorCodigoConvite.mockReset().mockResolvedValue(null);
    criarComAdministrador.mockReset();
  });

  it('tenta novamente após colisão na consulta e na gravação', async () => {
    buscarPorCodigoConvite.mockResolvedValueOnce(circulo);
    criarComAdministrador
      .mockResolvedValueOnce({ status: 'CODIGO_CONVITE_DUPLICADO' })
      .mockImplementationOnce(async ({ codigoConvite }) => ({
        status: 'CIRCULO_CRIADO',
        circulo: { ...circulo, codigoConvite },
      }));

    const criado = await caso.executar(dados);
    expect(criado).toEqual({
      ...circulo,
      codigoConvite: expect.stringMatching(formatoCodigo),
    });
    expect(buscarPorCodigoConvite).toHaveBeenCalledTimes(3);
    expect(criarComAdministrador).toHaveBeenCalledTimes(2);
    expect(criarComAdministrador).toHaveBeenLastCalledWith({
      ...dados,
      codigoConvite: criado.codigoConvite,
    });
    expect(buscarPorCodigoConvite).toHaveBeenLastCalledWith(
      criado.codigoConvite,
    );
  });

  it('limita a cinco tentativas se todos os códigos já existem', async () => {
    buscarPorCodigoConvite.mockResolvedValue(circulo);
    await expect(caso.executar(dados)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(buscarPorCodigoConvite).toHaveBeenCalledTimes(5);
    expect(criarComAdministrador).not.toHaveBeenCalled();
  });
});

describe('RenovarCodigoConviteUseCase', () => {
  const renovar =
    vi.fn<RenovarCodigoConviteTransacionalRepository['renovar']>();
  const caso = new RenovarCodigoConviteUseCase({ renovar });

  beforeEach(() => renovar.mockReset());

  it('tenta novamente após colisão e retorna o código gravado', async () => {
    renovar
      .mockResolvedValueOnce({ status: 'CODIGO_CONVITE_DUPLICADO' })
      .mockImplementationOnce(async (_, __, codigoConvite) => ({
        status: 'CODIGO_RENOVADO',
        codigoConvite,
      }));
    const resultado = await caso.executar('11', '22');
    expect(resultado.codigoConvite).toMatch(formatoCodigo);
    expect(renovar).toHaveBeenCalledTimes(2);
    expect(renovar).toHaveBeenLastCalledWith(
      '11',
      '22',
      resultado.codigoConvite,
    );
  });

  it('limita a cinco tentativas se as colisões persistem', async () => {
    renovar.mockResolvedValue({ status: 'CODIGO_CONVITE_DUPLICADO' });
    await expect(caso.executar('11', '22')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(renovar).toHaveBeenCalledTimes(5);
  });

  it.each([
    ['CIRCULO_NAO_ENCONTRADO', NotFoundException],
    ['USUARIO_NAO_AUTORIZADO', ForbiddenException],
  ] as const)('interrompe as tentativas em %s', async (status, erro) => {
    renovar.mockResolvedValue({ status });
    await expect(caso.executar('11', '22')).rejects.toBeInstanceOf(erro);
    expect(renovar).toHaveBeenCalledTimes(1);
  });
});
