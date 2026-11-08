import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { Circulo } from '../../../../domain/entities/circulo.entity.js';

import type {
  CirculoRepository,
  CriarCirculoDados,
  AtualizarCirculoDados,
} from '../../../../domain/repositories/circulo.repository.js';

import { CirculoOrmEntity } from '../entities/circulo.orm-entity.js';
import { MembroCirculoOrmEntity } from '../entities/membro-circulo.orm-entity.js';

@Injectable()
export class TypeOrmCirculoRepository implements CirculoRepository {
  constructor(
    @InjectRepository(CirculoOrmEntity)
    private readonly repository: Repository<CirculoOrmEntity>,
  ) {}

  /**
   * Converte a entidade ORM para o modelo de domínio.
   * Mantém o TypeORM isolado da camada de aplicação.
   */
  private paraDominio(circulo: CirculoOrmEntity): Circulo {
    return {
      id: circulo.id,
      nome: circulo.nome,
      codigoConvite: circulo.codigoConvite,
      dataCriacao: circulo.dataCriacao,
    };
  }

  // Cria um círculo no banco de dados.
  async criar(dados: CriarCirculoDados): Promise<Circulo> {
    const circulo = this.repository.create(dados);

    const circuloSalvo = await this.repository.save(circulo);

    return this.paraDominio(circuloSalvo);
  }

  // Busca um círculo pelo ID.
  async buscarPorId(id: string): Promise<Circulo | null> {
    const circulo = await this.repository.findOne({
      where: { id },
    });

    return circulo ? this.paraDominio(circulo) : null;
  }

  // Busca um círculo pelo código único de convite.
  async buscarPorCodigoConvite(
    codigoConvite: string,
  ): Promise<Circulo | null> {
    const circulo = await this.repository.findOne({
      where: { codigoConvite },
    });

    return circulo ? this.paraDominio(circulo) : null;
  }

  // Lista apenas os círculos dos quais o usuário participa.
  async listarPorUsuario(usuarioId: string): Promise<Circulo[]> {
    const circulos = await this.repository
      .createQueryBuilder('circulo')
      .innerJoin(
        MembroCirculoOrmEntity,
        'membro',
        'membro.circuloId = circulo.id',
      )
      .where('membro.usuarioId = :usuarioId', { usuarioId })
      .orderBy('circulo.nome', 'ASC')
      .getMany();

    return circulos.map((circulo) => this.paraDominio(circulo)); 
  }



/**
 * Atualiza os dados de um círculo existente.
 * A autorização do administrador é verificada
 * na camada de aplicação (Use Case).
 */
async atualizar(
  circuloId: string,
  dados: AtualizarCirculoDados,
): Promise<Circulo | null> {
  const circulo = await this.repository.findOne({
    where: { id: circuloId },
  });

  if (!circulo) {
    return null;
  }

  // Atualiza apenas os campos informados.
  if (dados.nome !== undefined) {
    circulo.nome = dados.nome;
  }

  const circuloAtualizado = await this.repository.save(circulo);

  return this.paraDominio(circuloAtualizado);
  }



/**
 * Realiza a exclusão lógica de um círculo.
 * O registro permanece no banco, mas recebe
 * uma data no campo deleted_at.
 */
async remover(circuloId: string): Promise<boolean> {
  const resultado = await this.repository
    .createQueryBuilder()
    .softDelete()
    .where('id_circulo = :circuloId', { circuloId })
    .andWhere('deleted_at IS NULL')
    .execute();

  return (resultado.affected ?? 0) > 0;
}


















}
