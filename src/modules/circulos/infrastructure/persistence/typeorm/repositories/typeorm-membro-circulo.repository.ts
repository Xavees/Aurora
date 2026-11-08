
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type {MembroCirculo,} from '../../../../domain/entities/membro-circulo.entity.js';
import type {AdicionarMembroDados,  MembroCirculoRepository,} from '../../../../domain/repositories/membro-circulo.repository.js';
import type {  FuncaoMembro,} from '../../../../domain/entities/membro-circulo.entity.js';

import { MembroCirculoOrmEntity } from '../entities/membro-circulo.orm-entity.js';



@Injectable()
export class TypeOrmMembroCirculoRepository implements MembroCirculoRepository {
  constructor(
    @InjectRepository(MembroCirculoOrmEntity)
    private readonly repository: Repository<MembroCirculoOrmEntity>,
  ) {}

  /**
   * Converte a entidade ORM para o modelo de domínio.
   * Evita que os casos de uso dependam do TypeORM.
   */
  private paraDominio(membro: MembroCirculoOrmEntity): MembroCirculo {
    return {
      id: membro.id,
      usuarioId: membro.usuarioId,
      circuloId: membro.circuloId,
      funcao: membro.funcao,
      dataEntrada: membro.dataEntrada,
    };
  }

  // Adiciona um usuário como participante de um círculo.
  async adicionar(dados: AdicionarMembroDados): Promise<MembroCirculo> {
    const membro = this.repository.create(dados);

    const membroSalvo = await this.repository.save(membro);

    return this.paraDominio(membroSalvo);
  }

  // Busca a participação de um usuário em um círculo específico.
  async buscarPorUsuarioECirculo(
    usuarioId: string,
    circuloId: string,
  ): Promise<MembroCirculo | null> {
    const membro = await this.repository.findOne({
      where: { usuarioId, circuloId },
    });

    return membro ? this.paraDominio(membro) : null;
  }

  // Lista todos os participantes de um círculo.
  async listarPorCirculo(circuloId: string): Promise<MembroCirculo[]> {
    const membros = await this.repository.find({
      where: { circuloId },
      order: { dataEntrada: 'ASC' },
    });

    return membros.map((membro) => this.paraDominio(membro));
  }

  // Remove um usuário de um círculo.
  async remover(
    usuarioId: string,
    circuloId: string,
  ): Promise<boolean> {
    const resultado = await this.repository.delete({
      usuarioId,
      circuloId,
    });

    return (resultado.affected ?? 0) > 0;
  }

  // Altera a função de um participante.
  async alterarFuncao(
    usuarioId: string,
    circuloId: string,
    funcao: FuncaoMembro,
  ): Promise<MembroCirculo | null> {
    const membro = await this.repository.findOne({
      where: { usuarioId, circuloId },
    });

    if (!membro) {
      return null;
    }

    membro.funcao = funcao;

    const membroAtualizado = await this.repository.save(membro);

    return this.paraDominio(membroAtualizado);
  }
}
