import { PartialType } from '@nestjs/mapped-types';
import { CriarContatoDto } from './criar-contato.dto.js';

// No PATCH, os campos podem ser omitidos,
// mas valores null continuam sujeitos às validações.
export class AtualizarContatoDto extends PartialType(
  CriarContatoDto,
  { skipNullProperties: false },
) {}