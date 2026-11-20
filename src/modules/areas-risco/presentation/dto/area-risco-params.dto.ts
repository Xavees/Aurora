import { BadRequestException } from '@nestjs/common';
import { IsString, Matches } from 'class-validator';

/**
 * Maior valor aceito por um BIGINT SIGNED no MariaDB.
 *
 * A coluna id_area_risco não possui UNSIGNED,
 * portanto seu limite é 2^63 - 1.
 */
const BIGINT_MAXIMO = 9223372036854775807n;

/**
 * Valida o identificador recebido pela URL.
 */
export class AreaRiscoParamsDto {
  @IsString()
  @Matches(/^[1-9]\d*$/, {
    message: 'O ID deve ser um inteiro positivo válido.',
  })
  id!: string;
}

/**
 * Complementa a validação do DTO verificando se o
 * identificador cabe no BIGINT utilizado pelo banco.
 *
 * Deve ser chamada no controller após o ValidationPipe.
 */
export function validarAreaRiscoId(id: string): void {
  if (!/^[1-9]\d*$/.test(id) || BigInt(id) > BIGINT_MAXIMO) {
    throw new BadRequestException(
      'O ID informado está fora do intervalo permitido.',
    );
  }
}
