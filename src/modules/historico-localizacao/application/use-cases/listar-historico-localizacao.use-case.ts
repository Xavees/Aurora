
import { Inject, Injectable } from '@nestjs/common';

import type {
  FiltrosHistoricoLocalizacao,
  HistoricoLocalizacaoRepository,
  ResultadoHistoricoLocalizacao,
} from '../../domain/repositories/historico-localizacao.repository.js';

import { HISTORICO_LOCALIZACAO_REPOSITORY } from '../../domain/repositories/historico-localizacao.repository.token.js';

/**
 * Caso de uso responsável por consultar
 * o histórico de localização de um usuário.
 *
 * Não depende diretamente do TypeORM.
 */
@Injectable()
export class ListarHistoricoLocalizacaoUseCase {
  constructor(
    @Inject(HISTORICO_LOCALIZACAO_REPOSITORY)
    private readonly historicoRepository: HistoricoLocalizacaoRepository,
  ) {}

  /**
   * Executa a consulta do histórico.
   *
   * O usuarioId deverá ser obtido do JWT pelo controller,
   * e nunca fornecido livremente pelo cliente.
   *
   * Os parâmetros de paginação e datas serão
   * validados posteriormente no DTO.
   */
  async executar(
    filtros: FiltrosHistoricoLocalizacao,
  ): Promise<ResultadoHistoricoLocalizacao> {
    return this.historicoRepository.listar(filtros);
  }
}
