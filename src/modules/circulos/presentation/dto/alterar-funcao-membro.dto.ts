
import { IsEnum } from 'class-validator';

import type { FuncaoMembro } from '../../domain/entities/membro-circulo.entity.js';

// Valores permitidos para a função de um participante.
export enum FuncaoMembroEnum {
  ADMINISTRADOR = 'ADMINISTRADOR',
  MEMBRO = 'MEMBRO',
}

export class AlterarFuncaoMembroDto {
  @IsEnum(FuncaoMembroEnum, {
    message: 'A função deve ser ADMINISTRADOR ou MEMBRO.',
  })
  funcao!: FuncaoMembro;
}
