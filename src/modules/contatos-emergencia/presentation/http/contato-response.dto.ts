import { ContatoEmergencia } from "../../domain/entities/contato-emergencia.entity.js";

export class ContatoResponseDto {
  id!: string;
  nome!: string;
  parentesco!: string | null;
  telefone!: string;

  static fromDomain(contato: ContatoEmergencia): ContatoResponseDto {
    const dto = new ContatoResponseDto();

    dto.id = contato.id;
    dto.nome = contato.nome;
    dto.parentesco = contato.parentesco;
    dto.telefone = contato.telefone;

    return dto;
  }
}
