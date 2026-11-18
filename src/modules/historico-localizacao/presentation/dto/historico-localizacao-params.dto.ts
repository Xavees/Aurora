import { IsString, Matches } from 'class-validator';

/**
 * Valida o identificador de um registro
 * do Histórico de Localização.
 *
 * IDs BIGINT são mantidos como string para evitar
 * perda de precisão no JavaScript.
 */
export class HistoricoLocalizacaoParamsDto {
  /**
   * Aceita somente inteiros positivos,
   * sem sinais, letras ou casas decimais.
   */
  @IsString()
  @Matches(/^[1-9]\d*$/, {
    message: 'O ID deve ser um número inteiro positivo.',
  })
  id!: string;
}
