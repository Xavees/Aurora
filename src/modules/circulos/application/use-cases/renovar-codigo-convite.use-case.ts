import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException,} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type { RenovarCodigoConviteTransacionalRepository } from '../../domain/repositories/renovar-codigo-convite-transacional.repository.js';
import { RENOVAR_CODIGO_CONVITE_TRANSACIONAL_REPOSITORY } from '../../domain/repositories/renovar-codigo-convite-transacional.repository.token.js';

@Injectable()
export class RenovarCodigoConviteUseCase {
  constructor(
    @Inject(RENOVAR_CODIGO_CONVITE_TRANSACIONAL_REPOSITORY)
    private readonly renovarRepository: RenovarCodigoConviteTransacionalRepository,
  ) {}

  /**
   * Gera um código de convite aleatório de 10 caracteres.
   */
  private gerarCodigoConvite(): string {
    return randomBytes(5).toString('hex').toUpperCase();
  }

  /**
   * Renova o código de convite de um círculo.
   *
   * Apenas administradores podem executar a operação.
   */
  async executar(
    circuloId: string,
    solicitanteId: string,
  ): Promise<{ codigoConvite: string }> {
    const maxTentativas = 5;
// o for loop tenta gerar um novo código de convite até 5 vezes, caso o código gerado seja duplicado. Se todas as tentativas falharem, lança uma exceção de conflito.
    for (let tentativa = 0; tentativa < maxTentativas; tentativa++) {
      const novoCodigo = this.gerarCodigoConvite();

      const resultado = await this.renovarRepository.renovar(
        circuloId,
        solicitanteId,
        novoCodigo,
      );

      switch (resultado.status) {
        case 'CODIGO_RENOVADO':
          return {
            codigoConvite: resultado.codigoConvite,
          };

        case 'CIRCULO_NAO_ENCONTRADO':
          throw new NotFoundException(
            'Círculo não encontrado.',
          );

        case 'USUARIO_NAO_AUTORIZADO':
          throw new ForbiddenException(
            'Apenas administradores podem renovar o código de convite.',
          );

        case 'CODIGO_CONVITE_DUPLICADO':
          // Gera outro código na próxima tentativa.
          continue;
      }
    }

    throw new ConflictException(
      'Não foi possível gerar um novo código de convite disponível.',
    );
  }
}
