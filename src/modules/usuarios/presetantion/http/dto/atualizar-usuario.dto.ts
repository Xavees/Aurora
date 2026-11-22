
import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  Matches,
  IsUrl,
  ValidateIf,
} from 'class-validator';

export class AtualizarUsuarioDto {
  /**
   * undefined: o usuário não quer atualizar o nome.
   * null: inválido, pois nome é obrigatório no banco.
   *
   * Diferente de IsOptional(), ValidateIf permite
   * que null seja avaliado pelos demais validadores.
   */
  @ValidateIf((_, valor) => valor !== undefined)
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Matches(/\S/, {
    message: 'Nome não pode conter apenas espaços.',
  })
  nome?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9]{10,15}$/, {
    message: 'Telefone deve conter entre 10 e 15 dígitos.',
  })
  telefone?: string;

  @IsOptional()
  @IsUrl({
    protocols: ['https'],
    require_protocol: true,
  })
  @MaxLength(255)
  fotoUrl?: string;
}
