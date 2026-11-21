
import { ApiProperty } from '@nestjs/swagger';

import type {
  AreaRisco,
  NivelRisco,
} from '../../domain/entities/area-risco.entity.js';

/**
 * Contrato público de uma área de risco.
 *
 * Não expõe dados internos de autoria ou moderação.
 */
export class AreaRiscoResponseDto {
  @ApiProperty({
    description: 'Identificador BIGINT representado como string.',
    example: '9007199254740993',
  })
  id!: string;

  @ApiProperty({
    description: 'Nome da área de risco.',
    example: 'Rua com iluminação inoperante',
  })
  nome!: string;

  @ApiProperty({
    description: 'Descrição da situação identificada.',
    example: 'Postes apagados durante a noite.',
    nullable: true,
    type: String,
  })
  descricao!: string | null;

  @ApiProperty({
    description: 'Classificação da gravidade.',
    enum: ['BAIXO', 'MEDIO', 'ALTO'],
    nullable: true,
  })
  nivelRisco!: NivelRisco | null;

  @ApiProperty({
    description: 'Latitude do centro da área.',
    example: -23.55052,
  })
  latitude!: number;

  @ApiProperty({
    description: 'Longitude do centro da área.',
    example: -46.633308,
  })
  longitude!: number;

  @ApiProperty({
    description: 'Raio de abrangência em metros.',
    example: 150,
    nullable: true,
    type: Number,
  })
  raioMetros!: number | null;

  @ApiProperty({
    description: 'Data de criação no formato ISO 8601.',
    example: '2026-11-20T20:00:00.000Z',
    format: 'date-time',
  })
  dataCriacao!: string;

  @ApiProperty({
    description: 'Data da última atualização no formato ISO 8601.',
    example: '2026-11-20T20:00:00.000Z',
    format: 'date-time',
  })
  dataAtualizacao!: string;

  /**
   * Converte a entidade de domínio em uma resposta HTTP.
   *
   * O DTO impede que campos internos sejam
   * expostos acidentalmente ao frontend.
   */
  static fromDomain(area: AreaRisco): AreaRiscoResponseDto {
    const dto = new AreaRiscoResponseDto();

    dto.id = area.id;
    dto.nome = area.nome;
    dto.descricao = area.descricao;
    dto.nivelRisco = area.nivelRisco;

    dto.latitude = area.latitude;
    dto.longitude = area.longitude;
    dto.raioMetros = area.raioMetros;

    dto.dataCriacao = area.dataCriacao.toISOString();
    dto.dataAtualizacao = area.dataAtualizacao.toISOString();

    return dto;
  }
}
