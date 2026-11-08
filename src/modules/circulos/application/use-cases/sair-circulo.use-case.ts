import {  Inject, Injectable, NotFoundException,} from '@nestjs/common';

import type { ResultadoSaidaCirculo } from '../../domain/repositories/sair-circulo-transacional.repository.js';
import type { SairCirculoTransacionalRepository } from '../../domain/repositories/sair-circulo-transacional.repository.js';

import { SAIR_CIRCULO_TRANSACIONAL_REPOSITORY } from '../../domain/repositories/sair-circulo-transacional.repository.token.js';

@Injectable()
export class SairCirculoUseCase {
  constructor(
    @Inject(SAIR_CIRCULO_TRANSACIONAL_REPOSITORY)
    private readonly sairCirculoRepository: SairCirculoTransacionalRepository,
  ) {}

  async executar(
    circuloId: string,
    usuarioId: string,
  ): Promise<ResultadoSaidaCirculo> {
    // A verificação e a saída são executadas dentro
    // da mesma transação para preservar a consistência.
    const resultado = await this.sairCirculoRepository.sair(
      circuloId,
      usuarioId,
    );

    switch (resultado) {
      case 'CIRCULO_NAO_ENCONTRADO':
        throw new NotFoundException('Círculo não encontrado.');

      case 'USUARIO_NAO_PARTICIPA':
        // Não revelamos detalhes de círculos privados.
        throw new NotFoundException('Círculo não encontrado.');

      case 'MEMBRO_REMOVIDO':
      case 'ADMINISTRADOR_TRANSFERIDO':
      case 'CIRCULO_DESATIVADO':
        return resultado;
    }
  }
}
