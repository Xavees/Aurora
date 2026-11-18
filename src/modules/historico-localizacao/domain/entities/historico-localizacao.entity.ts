
/**
 * Representa um registro de localização no domínio do Aurora.
 *
 * Não depende de NestJS, TypeORM ou infraestrutura.
 */
export interface HistoricoLocalizacao {
  id: string;
  usuarioId: string;
  dispositivoId: string | null;

  latitude: number;
  longitude: number;

  altitudeMetros: number | null;
  velocidadeKmh: number | null;
  satelites: number | null;
  bateria: number | null;

  sos: boolean;

  dataHoraGps: Date;
  recebidoEm: Date;
}
