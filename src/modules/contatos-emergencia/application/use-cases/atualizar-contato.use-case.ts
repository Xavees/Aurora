import {  Inject, Injectable,NotFoundException,} from '@nestjs/common';


import type { ContatoEmergencia } from '../../domain/entities/contato-emergencia.entity.js';

import type { ContatoEmergenciaRepository,  AtualizarContatoDados,} from '../../domain/repositories/contato-emergencia.repository.js';
import { CONTATO_EMERGENCIA_REPOSITORY } from '../../domain/repositories/contato-emergencia.repository.token.js';

@Injectable()
export class AtualizarContatoUseCase {
  constructor(
    @Inject(CONTATO_EMERGENCIA_REPOSITORY)
    private readonly contatoRepository: ContatoEmergenciaRepository,
  ) {}

  async executar(
    contatoId: string,
    usuarioId: string,
    dados: AtualizarContatoDados,
  ): Promise<ContatoEmergencia> {
    const contatoAtualizado = await this.contatoRepository.atualizar(
      contatoId,
      usuarioId,
      dados,
    );

    if (!contatoAtualizado) {
      throw new NotFoundException(
        'Contato de emergência não encontrado.',
      );
    }

    return contatoAtualizado;
  }
}
