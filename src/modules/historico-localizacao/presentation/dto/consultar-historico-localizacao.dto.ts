
import { Type } from 'class-transformer';
import {
  IsInt,
  IsISO8601,
  IsOptional,
  Matches,
  Max,
  Min,
} from 'class-validator';

/**
 * Parâmetros disponíveis para consultar o histórico.
 *
 * Exemplo:
 * GET /historico-localizacao/me?pagina=1&limite=20
 */
export class ConsultarHistoricoLocalizacaoDto {
  /**
   * Início do período consultado.
   *
   * Exigimos fuso horário explícito para evitar
   * ambiguidades entre cliente e servidor.
   */
  @IsOptional()
  @IsISO8601({ strict: true })
  @Matches(/(Z|[+-]\d{2}:\d{2})$/i, {
    message: 'dataInicio deve informar o fuso horário.',
  })
  dataInicio?: string;

  /**
   * Fim do período consultado.
   */
  @IsOptional()
  @IsISO8601({ strict: true })
  @Matches(/(Z|[+-]\d{2}:\d{2})$/i, {
    message: 'dataFim deve informar o fuso horário.',
  })
  dataFim?: string;

  /**
   * Página solicitada.
   * O valor padrão é 1.
   */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pagina: number = 1;

  /**
   * Quantidade de registros por página.
   *
   * Limitamos a 100 para evitar consultas
   * excessivamente grandes ao banco.
   */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limite: number = 20;
}
