import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AlterarFuncaoMembroCirculoUseCase } from './alterar-funcao-membro-circulo.use-case.js';
import type { AlterarFuncaoMembroTransacionalRepository } from '../../domain/repositories/alterar-funcao-membro-transacional.repository.js';
import { RemoverMembroCirculoUseCase } from './remover-membro-circulo.use-case.js';
import type { RemoverMembroTransacionalRepository } from '../../domain/repositories/remover-membro-transacional.repository.js';
import { DesbloquearMembroCirculoUseCase } from './desbloquear-membro-circulo.use-case.js';
import type { DesbloquearMembroTransacionalRepository } from '../../domain/repositories/desbloquear-membro-transacional.repository.js';

describe('AlterarFuncaoMembroCirculoUseCase', () => {
  const alterarFuncao =
    vi.fn<AlterarFuncaoMembroTransacionalRepository['alterarFuncao']>();
  const caso = new AlterarFuncaoMembroCirculoUseCase({ alterarFuncao });

  beforeEach(() => alterarFuncao.mockReset());

  it.each(['ADMINISTRADOR', 'MEMBRO'] as const)(
    'encaminha a função %s',
    async (funcao) => {
      alterarFuncao.mockResolvedValue('FUNCAO_ALTERADA');
      await expect(
        caso.executar('11', '22', '33', funcao),
      ).resolves.toBeUndefined();
      expect(alterarFuncao).toHaveBeenCalledExactlyOnceWith(
        '11',
        '22',
        '33',
        funcao,
      );
    },
  );

  it.each([
    ['CIRCULO_NAO_ENCONTRADO', NotFoundException],
    ['SOLICITANTE_NAO_E_ADMINISTRADOR', ForbiddenException],
    ['MEMBRO_NAO_ENCONTRADO', NotFoundException],
    ['ULTIMO_ADMINISTRADOR', ConflictException],
    ['FUNCAO_JA_ATRIBUIDA', ConflictException],
  ] as const)('converte %s em erro de aplicação', async (status, erro) => {
    alterarFuncao.mockResolvedValue(status);
    await expect(
      caso.executar('11', '22', '33', 'MEMBRO'),
    ).rejects.toBeInstanceOf(erro);
  });
});

describe('RemoverMembroCirculoUseCase', () => {
  const remover = vi.fn<RemoverMembroTransacionalRepository['remover']>();
  const caso = new RemoverMembroCirculoUseCase({ remover });

  beforeEach(() => remover.mockReset());

  it('encaminha os dados ao repositório e trata o sucesso', async () => {
    remover.mockResolvedValue('MEMBRO_REMOVIDO');
    await expect(caso.executar('11', '22', '33')).resolves.toBeUndefined();
    expect(remover).toHaveBeenCalledExactlyOnceWith('11', '22', '33');
  });

  it.each([
    ['CIRCULO_NAO_ENCONTRADO', NotFoundException],
    ['SOLICITANTE_NAO_E_ADMINISTRADOR', ForbiddenException],
    ['MEMBRO_NAO_ENCONTRADO', NotFoundException],
    ['AUTO_REMOCAO_NAO_PERMITIDA', ConflictException],
    ['REMOCAO_ADMINISTRADOR_NAO_PERMITIDA', ForbiddenException],
  ] as const)('converte %s em erro de aplicação', async (status, erro) => {
    remover.mockResolvedValue(status);
    await expect(caso.executar('11', '22', '33')).rejects.toBeInstanceOf(erro);
  });
});

describe('DesbloquearMembroCirculoUseCase', () => {
  const desbloquear =
    vi.fn<DesbloquearMembroTransacionalRepository['desbloquear']>();
  const caso = new DesbloquearMembroCirculoUseCase({ desbloquear });

  beforeEach(() => desbloquear.mockReset());

  it('encaminha os dados ao repositório e trata o sucesso', async () => {
    desbloquear.mockResolvedValue('MEMBRO_DESBLOQUEADO');
    await expect(caso.executar('11', '22', '33')).resolves.toBeUndefined();
    expect(desbloquear).toHaveBeenCalledExactlyOnceWith('11', '22', '33');
  });

  it.each([
    ['CIRCULO_NAO_ENCONTRADO', NotFoundException],
    ['SOLICITANTE_NAO_E_ADMINISTRADOR', ForbiddenException],
    ['BLOQUEIO_NAO_ENCONTRADO', NotFoundException],
  ] as const)('converte %s em erro de aplicação', async (status, erro) => {
    desbloquear.mockResolvedValue(status);
    await expect(caso.executar('11', '22', '33')).rejects.toBeInstanceOf(erro);
  });
});
