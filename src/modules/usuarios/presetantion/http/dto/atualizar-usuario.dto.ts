import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  Matches,
  IsUrl,
} from 'class-validator';

export class AtualizarUsuarioDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
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