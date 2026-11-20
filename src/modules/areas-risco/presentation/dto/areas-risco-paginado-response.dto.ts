
import type { ResultadoAreasRisco } from '../../domain/repositories/area-risco.repository.js';

import { AreaRiscoResponseDto } from './area-risco-response.dto.js';

/**
 * Define o contrato HTTP para a listagem paginada
 * de áreas de risco.
 */
export class AreasRiscoPaginadoResponseDto {
  registros!: AreaRiscoResponseDto[];

  total!: number;
  pagina!: number;
  limite!: number;
  totalPaginas!: number;

  /**
   * Converte o resultado do repositório para uma
   * resposta adequada ao frontend.
   */
  static fromDomain(
    resultado: ResultadoAreasRisco,
  ): AreasRiscoPaginadoResponseDto {
    const dto = new AreasRiscoPaginadoResponseDto();

    dto.registros = resultado.registros.map((area) =>
      AreaRiscoResponseDto.fromDomain(area),
    );

    dto.total = resultado.total;
    dto.pagina = resultado.pagina;
    dto.limite = resultado.limite;

    // Arredondamos para cima porque uma página pode
    // conter menos registros que o limite solicitado.
    dto.totalPaginas = Math.ceil(
      resultado.total / resultado.limite,
    );

    return dto;
  }
}
