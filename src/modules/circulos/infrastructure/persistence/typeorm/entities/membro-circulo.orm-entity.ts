
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

import type { FuncaoMembro } from '../../../../domain/entities/membro-circulo.entity.js';



@Entity({ name: 'membro_do_circulo' })
@Index('UQ_membro_usuario_circulo', ['usuarioId', 'circuloId'], {
  unique: true,
})
export class MembroCirculoOrmEntity {
  @PrimaryGeneratedColumn({
    name: 'id_membro',
    type: 'bigint',
  })
  id!: string;

  @Column({
    name: 'funcao',
    type: 'enum',
    enum: ['ADMINISTRADOR', 'MEMBRO'],
    default: 'MEMBRO',
  })
  funcao!: FuncaoMembro;

  @CreateDateColumn({
    name: 'data_entrada',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  dataEntrada!: Date;

  @Column({
    name: 'fk_usuario_id_usuario',
    type: 'bigint',
  })
  usuarioId!: string;

  @Column({
    name: 'fk_circulo_id_circulo',
    type: 'bigint',
  })
  circuloId!: string;
}
