import { Transform } from 'class-transformer';
import { IsEmail, MaxLength } from 'class-validator';

export class DesbloquearPorEmailDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(100)
  email!: string;
}
