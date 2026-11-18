import {
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { HistoricoLocalizacaoRepository,} from '../../domain/repositories/historico-localizacao.repository.js';
import type {HistoricoLocalizacao,} from '../../domain/entities/historico-localizacao.entity.js';
import { HISTORICO_LOCALIZACAO_REPOSITORY } from '../../domain/repositories/historico-localizacao.repository.token.js';

/**
 * Busca um registro específico do histórico de localização.
 *
 * O registro só será retornado se pertencer
 * ao usuário informado.
 */
@Injectable()
export class BuscarHistoricoLocalizacaoPorIdUseCase {
  constructor(
    @Inject(HISTORICO_LOCALIZACAO_REPOSITORY)
    private readonly historicoRepository: HistoricoLocalizacaoRepository,
  ) {}

  async executar(
    id: string,
    usuarioId: string,
  ): Promise<HistoricoLocalizacao> {
    const localizacao = await this.historicoRepository.buscarPorId(
      id,
      usuarioId,
    );

    if (!localizacao) {
      throw new NotFoundException(
        'Registro de localização não encontrado.',
      );
    }

    return localizacao;
  }
}
