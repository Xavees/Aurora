
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Registra usuários bloqueados administrativamente
 * de retornar a determinados círculos.
 */
@Entity({ name: 'bloqueio_circulo' })
@Index('UQ_bloqueio_usuario_circulo', ['usuarioId', 'circuloId'], {
  unique: true,
})
export class BloqueioCirculoOrmEntity {
  @PrimaryGeneratedColumn({
    name: 'id_bloqueio',
    type: 'bigint',
  })
  id!: string;

  @Column({
    name: 'fk_circulo_id_circulo',
    type: 'bigint',
  })
  circuloId!: string;

  @Column({
    name: 'fk_usuario_id_usuario',
    type: 'bigint',
  })
  usuarioId!: string;

  @Column({
    name: 'fk_bloqueado_por_id_usuario',
    type: 'bigint',
  })
  bloqueadoPorId!: string;

  @CreateDateColumn({
    name: 'data_bloqueio',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  dataBloqueio!: Date;
}
