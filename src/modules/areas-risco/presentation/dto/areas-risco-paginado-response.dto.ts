
import { ApiProperty } from '@nestjs/swagger';

import type { ResultadoAreasRisco } from '../../domain/repositories/area-risco.repository.js';

import { AreaRiscoResponseDto } from './area-risco-response.dto.js';

/**
 * Define o contrato HTTP para a listagem paginada
 * de áreas de risco.
 */
export class AreasRiscoPaginadoResponseDto {
  @ApiProperty({
    description: 'Áreas verificadas encontradas na página atual.',
    type: () => AreaRiscoResponseDto,
    isArray: true,
  })
  registros!: AreaRiscoResponseDto[];

  @ApiProperty({
    description: 'Quantidade total de registros encontrados.',
    example: 45,
    minimum: 0,
  })
  total!: number;

  @ApiProperty({
    description: 'Número da página atual.',
    example: 2,
    minimum: 1,
  })
  pagina!: number;

  @ApiProperty({
    description: 'Quantidade máxima de registros por página.',
    example: 20,
    minimum: 1,
  })
  limite!: number;

  @ApiProperty({
    description: 'Quantidade total de páginas disponíveis.',
    example: 3,
    minimum: 0,
  })
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

    // Arredondamos para cima porque a última página
    // pode conter menos registros que o limite solicitado.
    dto.totalPaginas = Math.ceil(
      resultado.total / resultado.limite,
    );

    return dto;
  }
}
