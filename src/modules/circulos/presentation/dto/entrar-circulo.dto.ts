
import {
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

export class EntrarCirculoDto {
  /**
   * Código de convite fornecido por
   * um participante do círculo.
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  codigoConvite!: string;
}
