
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

import type { NivelRisco } from '../../domain/entities/area-risco.entity.js';

/**
 * Valida os parâmetros de consulta enviados pelo frontend.
 *
 * A aplicação utiliza o ValidationPipe global do NestJS,
 * com transform: true.
 */
export class ConsultarAreasRiscoDto {
  /**
   * Filtro opcional por nível de risco.
   *
   * Quando não informado, a consulta não restringe
   * os resultados por nível.
   */
  @IsOptional()
  @IsIn(['BAIXO', 'MEDIO', 'ALTO'])
  nivelRisco?: NivelRisco;

  /**
   * Página solicitada.
   *
   * O Query Parameter chega como string pela URL.
   * O @Type converte o valor para number antes da validação.
   */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pagina: number = 1;

  /**
   * Quantidade máxima de registros por página.
   *
   * Limitamos a 100 para evitar consultas excessivamente
   * grandes a partir de uma única requisição.
   */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limite: number = 20;
}
