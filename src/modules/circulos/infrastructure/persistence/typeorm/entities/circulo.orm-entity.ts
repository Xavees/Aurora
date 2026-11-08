import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  DeleteDateColumn,
} from 'typeorm';

@Entity({ name: 'circulo' })
export class CirculoOrmEntity {
  @PrimaryGeneratedColumn({
    name: 'id_circulo',
    type: 'bigint',
  })
  id!: string;

  @Column({
    name: 'codigo_convite',
    type: 'varchar',
    length: 10,
    unique: true,
  })
  codigoConvite!: string;

  @Column({
    name: 'nome',
    type: 'varchar',
    length: 100,
  })
  nome!: string;

  @CreateDateColumn({
    name: 'data_criacao',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  dataCriacao!: Date;

@DeleteDateColumn({
  name: 'deleted_at',
  type: 'timestamp',
  nullable: true,
})
deletedAt!: Date | null;











}
