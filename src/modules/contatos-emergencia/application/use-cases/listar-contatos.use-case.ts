
import { Inject, Injectable } from '@nestjs/common';

import type { ContatoEmergencia } from '../../domain/entities/contato-emergencia.entity.js';

import type { ContatoEmergenciaRepository } from '../../domain/repositories/contato-emergencia.repository.js';

import { CONTATO_EMERGENCIA_REPOSITORY } from '../../domain/repositories/contato-emergencia.repository.token.js';

@Injectable()
export class ListarContatosUseCase {
  constructor(
    @Inject(CONTATO_EMERGENCIA_REPOSITORY)
    private readonly contatoRepository: ContatoEmergenciaRepository,
  ) {}

  async executar(usuarioId: string): Promise<ContatoEmergencia[]> {
    return this.contatoRepository.listarPorUsuario(usuarioId);
  }
}
