import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { ContatoEmergencia } from '../../../../domain/entities/contato-emergencia.entity.js';
import type {  ContatoEmergenciaRepository,  CriarContatoDados,AtualizarContatoDados,} from '../../../../domain/repositories/contato-emergencia.repository.js';
import { ContatoEmergenciaOrmEntity } from '../entities/contato-emergencia.orm-entity.js';

@Injectable()
export class TypeOrmContatoEmergenciaRepository
  implements ContatoEmergenciaRepository
{
  constructor(
    @InjectRepository(ContatoEmergenciaOrmEntity)
    private readonly repository: Repository<ContatoEmergenciaOrmEntity>,
  ) {}

  /**
   * Converte a entidade de persistência para o modelo de domínio.
   * Assim, os casos de uso não dependem diretamente do TypeORM.
   */
  private paraDominio(
    contato: ContatoEmergenciaOrmEntity,
  ): ContatoEmergencia {
    return {
      id: contato.id,
      nome: contato.nome,
      parentesco: contato.parentesco,
      telefone: contato.telefone,
      usuarioId: contato.usuarioId,
    };
  }
// método para criar um novo contato de emergência no banco de dados
  async criar(dados: CriarContatoDados): Promise<ContatoEmergencia> {
    const contato = this.repository.create(dados);

    const contatoSalvo = await this.repository.save(contato);

    return this.paraDominio(contatoSalvo);
  }
//metodo para listar todos os contatos de emergência de um usuário específico, ordenados pelo nome

  async listarPorUsuario(
    usuarioId: string,
  ): Promise<ContatoEmergencia[]> {
    const contatos = await this.repository.find({
      where: { usuarioId },
      order: { nome: 'ASC' },
    });

    return contatos.map((contato) => this.paraDominio(contato));
  }


  // metodo para buscar um contato de emergência específico pelo ID e pelo ID do usuário
  async buscarPorIdEUsuario(
    contatoId: string,
    usuarioId: string,
  ): Promise<ContatoEmergencia | null> {
    const contato = await this.repository.findOne({
      where: {
        id: contatoId,
        usuarioId,
      },
    });

    return contato ? this.paraDominio(contato) : null;
  }
 //metodo para atualizar um contato de emergência específico pelo ID e pelo ID do usuário, com os dados fornecidos


  async atualizar(
    contatoId: string,
    usuarioId: string,
    dados: AtualizarContatoDados,
  ): Promise<ContatoEmergencia | null> {
    const contato = await this.repository.findOne({
      where: {
        id: contatoId,
        usuarioId,
      },
    });

    if (!contato) {
      return null;
    }

    // Só modifica os campos realmente enviados na requisição.
    if (dados.nome !== undefined) {
      contato.nome = dados.nome;
    }

    if (dados.parentesco !== undefined) {
      contato.parentesco = dados.parentesco;
    }

    if (dados.telefone !== undefined) {
      contato.telefone = dados.telefone;
    }

    const contatoAtualizado = await this.repository.save(contato);

    return this.paraDominio(contatoAtualizado);
  }


        // metodo para remover um contato de emergência específico pelo ID e pelo ID do usuário
        
  async remover(
    contatoId: string,
    usuarioId: string,
  ): Promise<boolean> {
    // A exclusão exige simultaneamente o ID e o proprietário.
    const resultado = await this.repository.delete({
      id: contatoId,
      usuarioId,
    });

    return (resultado.affected ?? 0) > 0;
  }
}
