
import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

import {
  ApiPropertyOptional,
} from '@nestjs/swagger';

import type { NivelRisco } from '../../domain/entities/area-risco.entity.js';

/**
 * Dados permitidos na atualização parcial de uma área.
 *
 * undefined: campo não enviado, deve ser preservado.
 * null: remove o valor de um campo que aceita null.
 *
 * Não utilizamos inicializadores (= null) porque isso
 * modificaria o significado dos campos ausentes no PATCH.
 */
export class AtualizarAreaRiscoDto {
  @ApiPropertyOptional({
    description: 'Novo nome da área de risco.',
    example: 'Praça com iluminação reduzida',
    maxLength: 100,
  })
  // Não aceita null, mas permite ausência do campo.
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nome?: string;

  @ApiPropertyOptional({
    description: 'Nova descrição ou null para removê-la.',
    example: 'Iluminação danificada durante a noite.',
    maxLength: 255,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  descricao?: string | null;

  @ApiPropertyOptional({
    description: 'Novo nível de risco ou null para removê-lo.',
    enum: ['BAIXO', 'MEDIO', 'ALTO'],
    example: 'MEDIO',
    nullable: true,
  })
  @IsOptional()
  @IsIn(['BAIXO', 'MEDIO', 'ALTO'])
  nivelRisco?: NivelRisco | null;

  @ApiPropertyOptional({
    description: 'Nova latitude do centro da área.',
    example: -23.55052,
    minimum: -90,
    maximum: 90,
    type: Number,
  })
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsNumber({ maxDecimalPlaces: 8 })
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Nova longitude do centro da área.',
    example: -46.633308,
    minimum: -180,
    maximum: 180,
    type: Number,
  })
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsNumber({ maxDecimalPlaces: 8 })
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({
    description: 'Novo raio em metros ou null para removê-lo.',
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
  raioMetros?: number | null;
}
