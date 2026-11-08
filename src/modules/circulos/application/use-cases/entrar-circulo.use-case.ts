
import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';

import type { MembroCirculo } from '../../domain/entities/membro-circulo.entity.js';

import type { EntrarCirculoTransacionalRepository } from '../../domain/repositories/entrar-circulo-transacional.repository.js';

import { ENTRAR_CIRCULO_TRANSACIONAL_REPOSITORY } from '../../domain/repositories/entrar-circulo-transacional.repository.token.js';

@Injectable()
export class EntrarCirculoUseCase {
  constructor(
    @Inject(ENTRAR_CIRCULO_TRANSACIONAL_REPOSITORY)
    private readonly entrarCirculoRepository: EntrarCirculoTransacionalRepository,
  ) {}

  /**
   * Permite entrar em um círculo ativo utilizando
   * um código de convite.
   *
   * A verificação e a inclusão do participante
   * são executadas dentro de uma transação.
   */
  async executar(
    codigoConvite: string,
    usuarioId: string,
  ): Promise<MembroCirculo> {
    const resultado = await this.entrarCirculoRepository.entrar(
      codigoConvite,
      usuarioId,
    );

    switch (resultado.status) {
      case 'CIRCULO_NAO_ENCONTRADO':
        throw new NotFoundException(
          'Código de convite inválido ou círculo indisponível.',
        );

      case 'USUARIO_JA_PARTICIPA':
        throw new ConflictException(
          'Você já participa deste círculo.',
        );


          case 'USUARIO_BLOQUEADO':
    throw new ForbiddenException(
      'Você não tem permissão para entrar neste círculo.',
    );








      case 'MEMBRO_ADICIONADO':
        return resultado.membro;
    }
  }
}
