
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import type { NivelRisco, StatusVerificacaoAreaRisco, TipoOrigemAreaRisco } from '../../../../domain/entities/area-risco.entity.js';

/**
 * Representação da tabela area_de_risco no MariaDB.
 *
 * Esta classe pertence à infraestrutura e descreve
 * como os dados são armazenados no banco.
 */
@Entity({ name: 'area_de_risco' })
export class AreaRiscoOrmEntity {
  @PrimaryGeneratedColumn({
    name: 'id_area_risco',
    type: 'bigint',
  })
  id!: string;

  @Column({
    name: 'nome_area',
    type: 'varchar',
    length: 100,
  })
  nome!: string;

  @Column({
    name: 'descricao_area',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  descricao!: string | null;

  @Column({
    name: 'nivel_risco',
    type: 'enum',
    enum: ['BAIXO', 'MEDIO', 'ALTO'],
    nullable: true,
  })
  nivelRisco!: NivelRisco | null;

  /**
   * O TypeORM recebe DECIMAL como string para evitar
   * perda de precisão durante a leitura do banco.
   *
   * A conversão para number acontecerá no repositório.
   */
  @Column({
    name: 'raio_metros',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  raioMetros!: string | null;

  @Column({
    name: 'latitude',
    type: 'decimal',
    precision: 10,
    scale: 8,
  })
  latitude!: string;

  @Column({
    name: 'longitude',
    type: 'decimal',
    precision: 11,
    scale: 8,
  })
  longitude!: string;

  @CreateDateColumn({
    name: 'data_criacao',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  dataCriacao!: Date;

  @UpdateDateColumn({
    name: 'data_atualizacao',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  dataAtualizacao!: Date;

  @Column({
    name: 'fk_usuario_id_usuario',
    type: 'bigint',
    nullable: true,
  })
  usuarioId!: string | null;


  /**
   * Identifica se a informação possui origem
   * institucional ou foi enviada pela comunidade.
   */
  @Column({
    name: 'tipo_origem',
    type: 'enum',
    enum: ['OFICIAL', 'COLABORATIVA'],
    nullable: true,
  })
  tipoOrigem!: TipoOrigemAreaRisco | null;

  /**
   * Estado atual da moderação do registro.
   */
  @Column({
    name: 'status_verificacao',
    type: 'enum',
    enum: ['PENDENTE', 'VERIFICADA', 'REJEITADA'],
    nullable: true,
  })
  statusVerificacao!: StatusVerificacaoAreaRisco | null;

  @Column({
    name: 'fonte',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  fonte!: string | null;

  @Column({
    name: 'data_referencia',
    type: 'datetime',
    nullable: true,
  })
  dataReferencia!: Date | null;

  @Column({
    name: 'verificado_em',
    type: 'datetime',
    nullable: true,
  })
  verificadoEm!: Date | null;

  @Column({
    name: 'fk_verificado_por_id_usuario',
    type: 'bigint',
    nullable: true,
  })
  verificadoPorUsuarioId!: string | null;

  /**
   * Exclusão lógica.
   */
  @Column({
    name: 'excluido_em',
    type: 'datetime',
    nullable: true,
  })
  excluidoEm!: Date | null;
}
