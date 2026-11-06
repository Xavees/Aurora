
import {
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';

@Injectable()
export class PositiveBigIntPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    // Aceita somente inteiros positivos em formato decimal.
    if (!/^[1-9][0-9]*$/.test(value)) {
      throw new BadRequestException(
        'O ID deve ser um número inteiro positivo.',
      );
    }

    // BIGINT SIGNED do MariaDB tem limite máximo de 2^63 - 1.
    // Usamos BigInt para não perder precisão.
    if (BigInt(value) > 9223372036854775807n) {
      throw new BadRequestException(
        'O ID informado excede o limite permitido.',
      );
    }

    return value;
  }
}
