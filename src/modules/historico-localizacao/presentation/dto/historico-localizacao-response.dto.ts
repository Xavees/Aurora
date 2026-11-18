
import type { HistoricoLocalizacao } from '../../domain/entities/historico-localizacao.entity.js';

/**
 * Representa os dados de localização expostos pela API.
 *
 * Não retorna informações internas, como ip_origem.
 */
export class HistoricoLocalizacaoResponseDto {
  id!: string;
  usuarioId!: string;

  latitude!: number;
  longitude!: number;

  altitudeMetros!: number | null;
  velocidadeKmh!: number | null;

  dataHoraGps!: string;
  recebidoEm!: string;

  /**
   * Converte a entidade de domínio para o formato
   * que será enviado ao frontend.
   */
  static fromDomain(
    localizacao: HistoricoLocalizacao,
  ): HistoricoLocalizacaoResponseDto {
    const dto = new HistoricoLocalizacaoResponseDto();

    dto.id = localizacao.id;
    dto.usuarioId = localizacao.usuarioId;

    dto.latitude = localizacao.latitude;
    dto.longitude = localizacao.longitude;

    dto.altitudeMetros = localizacao.altitudeMetros;
    dto.velocidadeKmh = localizacao.velocidadeKmh;

    dto.dataHoraGps = localizacao.dataHoraGps.toISOString();
    dto.recebidoEm = localizacao.recebidoEm.toISOString();

    return dto;
  }
}
