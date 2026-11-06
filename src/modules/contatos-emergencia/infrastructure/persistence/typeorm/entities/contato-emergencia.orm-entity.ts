import { Entity, PrimaryGeneratedColumn,Column,} from 'typeorm';


// definindo a entidade do TypeORM para o contato de emergência

@Entity({ name: 'contato_de_emergencia' })
export class ContatoEmergenciaOrmEntity {
  @PrimaryGeneratedColumn({
    name: 'id_contato',
    type: 'bigint',
  })
  id!: string;
 // o ! indica que o campo é obrigatório e não pode ser nulo


  @Column({
    name: 'nome',
    type: 'varchar',
    length: 100,
  })
  nome!: string;



  @Column({
    name: 'parentesco',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  parentesco!: string | null;

  @Column({
    name: 'telefone',
    type: 'varchar',
    length: 20,
  })
  telefone!: string;

  @Column({
    name: 'fk_usuario_id_usuario',
    type: 'bigint',
  })
  usuarioId!: string;
}
