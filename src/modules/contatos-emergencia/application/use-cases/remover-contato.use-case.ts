import { Inject,Injectable,  NotFoundException,} from '@nestjs/common';
import type { ContatoEmergenciaRepository } from '../../domain/repositories/contato-emergencia.repository.js';
import { CONTATO_EMERGENCIA_REPOSITORY } from '../../domain/repositories/contato-emergencia.repository.token.js';



@Injectable()
export class RemoverContatoUseCase {
  constructor(
    @Inject(CONTATO_EMERGENCIA_REPOSITORY)
    private readonly contatoRepository: ContatoEmergenciaRepository,
  ) {}

  async executar(
    contatoId: string,
    usuarioId: string,
  ): Promise<void> {
    const removido = await this.contatoRepository.remover(
      contatoId,
      usuarioId,
    );

    if (!removido) {
      throw new NotFoundException(
        'Contato de emergência não encontrado.',
      );
    }
  }
}
