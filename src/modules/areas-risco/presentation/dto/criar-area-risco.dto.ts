
import {
  IsDefined,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  IsNotEmpty,
} from 'class-validator';

import {
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';

import type { NivelRisco } from '../../domain/entities/area-risco.entity.js';

/**
 * Dados aceitos no cadastro de uma área de risco.
 *
 * O autor, a origem e o status de verificação
 * são definidos pelo backend.
 */
export class CriarAreaRiscoDto {
  @ApiProperty({
    description: 'Nome identificador da área de risco.',
    example: 'Rua com iluminação inoperante',
    maxLength: 100,
  })
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nome!: string;

  @ApiPropertyOptional({
    description: 'Descrição da situação identificada.',
    example: 'Postes apagados durante a noite.',
    maxLength: 255,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  descricao: string | null = null;

  @ApiPropertyOptional({
    description: 'Classificação da gravidade informada pelo usuário.',
    enum: ['BAIXO', 'MEDIO', 'ALTO'],
    example: 'MEDIO',
    nullable: true,
  })
  @IsOptional()
  @IsIn(['BAIXO', 'MEDIO', 'ALTO'])
  nivelRisco: NivelRisco | null = null;

  @ApiProperty({
    description: 'Latitude do centro da área.',
    example: -23.55052,
    minimum: -90,
    maximum: 90,
    type: Number,
  })
  @IsDefined()
  @IsNumber({ maxDecimalPlaces: 8 })
  @Min(-90)
  @Max(90)
  latitude!: number;

  @ApiProperty({
    description: 'Longitude do centro da área.',
    example: -46.633308,
    minimum: -180,
    maximum: 180,
    type: Number,
  })
  @IsDefined()
  @IsNumber({ maxDecimalPlaces: 8 })
  @Min(-180)
  @Max(180)
  longitude!: number;

  @ApiPropertyOptional({
    description: 'Raio de abrangência da área, em metros.',
    example: 150,
    minimum: 0.01,
    maximum: 99999999.99,
    nullable: true,
    type: Number,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(99999999.99)
  raioMetros: number | null = null;
}
