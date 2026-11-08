import { ConflictException,ForbiddenException,Inject,Injectable,NotFoundException,} from '@nestjs/common';
import type {  RemoverMembroTransacionalRepository,} from '../../domain/repositories/remover-membro-transacional.repository.js';
import { REMOVER_MEMBRO_TRANSACIONAL_REPOSITORY } from '../../domain/repositories/remover-membro-transacional.repository.token.js';

@Injectable()
export class RemoverMembroCirculoUseCase {
  constructor(
    @Inject(REMOVER_MEMBRO_TRANSACIONAL_REPOSITORY)
    private readonly removerMembroRepository: RemoverMembroTransacionalRepository,
  ) {}

  async executar(
    circuloId: string,
    solicitanteId: string,
    membroId: string,
  ): Promise<void> {
    // O repository executa as verificações e a remoção
    // dentro de uma única transação no banco de dados.
    const resultado = await this.removerMembroRepository.remover(
      circuloId,
      solicitanteId,
      membroId,
    );

    switch (resultado) {
      case 'CIRCULO_NAO_ENCONTRADO':
        throw new NotFoundException('Círculo não encontrado.');

      case 'SOLICITANTE_NAO_E_ADMINISTRADOR':
        throw new ForbiddenException(
          'Você não possui permissão para remover participantes.',
        );

      case 'MEMBRO_NAO_ENCONTRADO':
        throw new NotFoundException(
          'Participante não encontrado neste círculo.',
        );

      case 'AUTO_REMOCAO_NAO_PERMITIDA':
        throw new ConflictException(
          'Para sair do círculo, utilize a funcionalidade de saída voluntária.',
        );

      case 'REMOCAO_ADMINISTRADOR_NAO_PERMITIDA':
        throw new ForbiddenException(
          'Não é permitido remover outro administrador.',
        );

      case 'MEMBRO_REMOVIDO':
        return;
    }
  }
}
