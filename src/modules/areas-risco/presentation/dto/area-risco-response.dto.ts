
import type {
  AreaRisco,
  NivelRisco,
} from '../../domain/entities/area-risco.entity.js';

/**
 * Define o contrato público de uma área de risco.
 *
 * O frontend recebe somente os dados necessários
 * para exibir informações e perímetros no mapa.
 */
export class AreaRiscoResponseDto {
  id!: string;

  nome!: string;
  descricao!: string | null;
  nivelRisco!: NivelRisco | null;

  latitude!: number;
  longitude!: number;
  raioMetros!: number | null;

  dataCriacao!: string;
  dataAtualizacao!: string;

  /**
   * Converte uma entidade de domínio no formato
   * utilizado nas respostas HTTP.
   */
  static fromDomain(area: AreaRisco): AreaRiscoResponseDto {
    const dto = new AreaRiscoResponseDto();

    dto.id = area.id;

    dto.nome = area.nome;
    dto.descricao = area.descricao;
    dto.nivelRisco = area.nivelRisco;

    dto.latitude = area.latitude;
    dto.longitude = area.longitude;
    dto.raioMetros = area.raioMetros;

    // Datas ISO 8601 facilitam a integração com o React.
    dto.dataCriacao = area.dataCriacao.toISOString();
    dto.dataAtualizacao = area.dataAtualizacao.toISOString();

    return dto;
  }
}
