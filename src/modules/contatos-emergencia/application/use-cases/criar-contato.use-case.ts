import { Inject, Injectable } from '@nestjs/common';
import type { ContatoEmergencia } from '../../domain/entities/contato-emergencia.entity.js';
import type { ContatoEmergenciaRepository } from '../../domain/repositories/contato-emergencia.repository.js';
import { CONTATO_EMERGENCIA_REPOSITORY } from '../../domain/repositories/contato-emergencia.repository.token.js';

export interface CriarContatoInput {
  nome: string;
  parentesco: string | null;
  telefone: string;
  usuarioId: string;
}

@Injectable()
export class CriarContatoUseCase {
  constructor(
    @Inject(CONTATO_EMERGENCIA_REPOSITORY)
    private readonly contatoRepository: ContatoEmergenciaRepository,
  ) {}

  async executar(
    dados: CriarContatoInput,
  ): Promise<ContatoEmergencia> {
    return this.contatoRepository.criar({
      nome: dados.nome,
      parentesco: dados.parentesco,
      telefone: dados.telefone,
      usuarioId: dados.usuarioId,
    });
  }
}
