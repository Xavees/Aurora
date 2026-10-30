import type { Usuario } from '../../../domain/entities/usuario.entity.js';


//  O DTO permite controlar exatamente quais informações serão enviadas para o Front-End.

export class UsuarioResponseDto {
  id!: string;
  nome!: string;
  email!: string;
  telefone!: string | null;
  fotoUrl!: string | null;
  tipoUsuario!: 'COMUM' | 'PREMIUM';

  /**
   * Converte o modelo da aplicação em uma resposta HTTP.
   *
   * Esse mapeamento explícito evita retornar acidentalmente
   * campos sensíveis da entidade do banco, como senha,
   * firebaseUid ou outras informações internas.
   */
  static fromDomain(usuario: Usuario): UsuarioResponseDto {
    const dto = new UsuarioResponseDto();

    dto.id = usuario.id;
    dto.nome = usuario.nome;
    dto.email = usuario.email;
    dto.telefone = usuario.telefone;
    dto.fotoUrl = usuario.fotoUrl;
    dto.tipoUsuario = usuario.tipoUsuario;

    return dto;
  }
}