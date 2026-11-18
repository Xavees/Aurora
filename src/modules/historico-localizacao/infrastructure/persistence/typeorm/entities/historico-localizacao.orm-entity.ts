import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Representa uma localização registrada no Aurora.
 *
 * Mapeia a tabela historico_localizacao do MariaDB.
 * Não contém regras de negócio: apenas a persistência.
 */
@Entity({ name: 'historico_localizacao' })
export class HistoricoLocalizacaoOrmEntity {
  @PrimaryGeneratedColumn({
    name: 'id_localizacao',
    type: 'bigint',
    unsigned: true,
  })
  id!: string;

  @Column({
    name: 'fk_usuario_id_usuario',
    type: 'bigint',
  })
  usuarioId!: string;

  // Opcional: utilizado quando a localização vem
  // de um dispositivo embarcado.
  @Column({
    name: 'fk_dispositivo_id_dispositivo',
    type: 'bigint',
    nullable: true,
  })
  dispositivoId!: string | null;

  @Column({
    name: 'latitude',
    type: 'decimal',
    precision: 10,
    scale: 7,
  })
  latitude!: string;

  @Column({
    name: 'longitude',
    type: 'decimal',
    precision: 11,
    scale: 7,
  })
  longitude!: string;

  @Column({
    name: 'altitude_m',
    type: 'decimal',
    precision: 8,
    scale: 2,
    nullable: true,
  })
  altitudeMetros!: string | null;

  @Column({
    name: 'velocidade_kmh',
    type: 'decimal',
    precision: 6,
    scale: 2,
    nullable: true,
  })
  velocidadeKmh!: string | null;

  @Column({
    name: 'satelites',
    type: 'tinyint',
    unsigned: true,
    nullable: true,
  })
  satelites!: number | null;

  @Column({
    name: 'bateria',
    type: 'int',
    nullable: true,
  })
  bateria!: number | null;

  @Column({
    name: 'sos',
    type: 'tinyint',
    default: 0,
  })
  sos!: number;

  @Column({
    name: 'data_hora_gps',
    type: 'datetime',
  })
  dataHoraGps!: Date;

  @CreateDateColumn({
    name: 'recebido_em',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  recebidoEm!: Date;

  @Column({
    name: 'ip_origem',
    type: 'varchar',
    length: 45,
    nullable: true,
  })
  ipOrigem!: string | null;
}
