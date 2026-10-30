import { IsNumberString } from 'class-validator';

export class BuscarUsuarioParamDto {
  /**
   * BIGINT é representado como string na aplicação.
   * A validação impede letras, números negativos
   * e valores decimais no parâmetro.
   */
  @IsNumberString({ no_symbols: true })
  id!: string;
}