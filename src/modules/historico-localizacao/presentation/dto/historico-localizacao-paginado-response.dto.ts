import type { ResultadoHistoricoLocalizacao,} from '../../domain/repositories/historico-localizacao.repository.js';
import {  HistoricoLocalizacaoResponseDto,} from './historico-localizacao-response.dto.js';

/**
 * Representa uma resposta paginada do histórico
 * de localização.
 */
export class HistoricoLocalizacaoPaginadoResponseDto {
  registros!: HistoricoLocalizacaoResponseDto[];

  total!: number;
  pagina!: number;
  limite!: number;
  totalPaginas!: number;

  static fromDomain(
    resultado: ResultadoHistoricoLocalizacao,
  ): HistoricoLocalizacaoPaginadoResponseDto {
    const dto = new HistoricoLocalizacaoPaginadoResponseDto();

    // Converte cada registro para o formato público da API.
    dto.registros = resultado.registros.map((registro) =>
      HistoricoLocalizacaoResponseDto.fromDomain(registro),
    );

    dto.total = resultado.total;
    dto.pagina = resultado.pagina;
    dto.limite = resultado.limite;

    // Calcula a quantidade de páginas disponíveis.
    dto.totalPaginas = Math.ceil(
      resultado.total / resultado.limite,
    );

    return dto;
  }
}
