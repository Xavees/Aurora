import type { Circulo } from '../../domain/entities/circulo.entity.js';


export class CirculoResponseDto {
  id!: string;
  nome!: string;
  codigoConvite!: string;
  dataCriacao!: Date;

  /**
   * Converte o modelo de domínio para
   * o formato de resposta da API.
   */
  static fromDomain(circulo: Circulo): CirculoResponseDto {
    const response = new CirculoResponseDto();

    response.id = circulo.id;
    response.nome = circulo.nome;
    response.codigoConvite = circulo.codigoConvite;
    response.dataCriacao = circulo.dataCriacao;

    return response;
  }
}
