import {
  Entity,
  PrimaryGeneratedColumn,
  Column,DeleteDateColumn
} from 'typeorm';

export enum TipoUsuario {
  COMUM = 'COMUM',
  PREMIUM = 'PREMIUM',
}

@Entity({ name: 'usuario' })
export class UsuarioOrmEntity {
  @PrimaryGeneratedColumn({
    name: 'id_usuario',
    type: 'bigint',
  })
  id!: string;
// coloquei ! pra representar que vai ser inicializada de outra forma no caso o TypeOrm
  @Column({
    name: 'firebase_uid',
    type: 'varchar',
    length: 128,
    nullable: true,
    unique: true,
  })
  firebaseUid!: string | null;

  @Column({
    name: 'nome',
    type: 'varchar',
    length: 100,
  })
  nome!: string;

  @Column({
    name: 'email',
    type: 'varchar',
    length: 100,
    unique: true,
  })
  email!: string;

  @Column({
    name: 'senha',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  senha!: string | null;

  @Column({
    name: 'telefone',
    type: 'varchar',
    length: 20,
    nullable: true,
    unique: true,
  })
  telefone!: string | null;

  @Column({
    name: 'foto_url',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  fotoUrl!: string | null;

  @Column({
    name: 'tipo_usuario',
    type: 'enum',
    enum: TipoUsuario,
    default: TipoUsuario.COMUM,
  })
  tipoUsuario!: TipoUsuario;

  @DeleteDateColumn({
  name: 'excluido_em',
  type: 'datetime',
  precision: 6,
  nullable: true,
})
excluidoEm!: Date | null;







}