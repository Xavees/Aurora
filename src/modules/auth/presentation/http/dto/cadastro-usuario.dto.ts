import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CadastroUsuarioDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nome!: string;

  @IsEmail()
  @MaxLength(100)
  email!: string;

  /**
   * Regras iniciais de senha.
   *
   * Permitimos senhas longas e não exigimos
   * combinações arbitrárias de símbolos.
   */
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  senha!: string;
}