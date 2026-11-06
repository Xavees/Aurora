
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CriarContatoDto {
  // Remove espaços nas extremidades antes da validação.
  // Assim, nomes contendo apenas espaços são rejeitados.
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nome!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  parentesco?: string | null;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[0-9]{10,15}$/, {
    message:
      'O telefone deve conter entre 10 e 15 dígitos, com + opcional no início.',
  })
  telefone!: string;
}
