
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { MembroCirculo } from '../../../../domain/entities/membro-circulo.entity.js';
import type { MembroCirculoRepository } from '../../../../domain/repositories/membro-circulo.repository.js';

import { MembroCirculoOrmEntity } from '../entities/membro-circulo.orm-entity.js';

@Injectable()
export class TypeOrmMembroCirculoRepository
  implements MembroCirculoRepository
{
  constructor(
    @InjectRepository(MembroCirculoOrmEntity)
    private readonly repository: Repository<MembroCirculoOrmEntity>,
  ) {}

  private paraDominio(membro: MembroCirculoOrmEntity): MembroCirculo {
    return {
      id: membro.id,
      usuarioId: membro.usuarioId,
      circuloId: membro.circuloId,
      funcao: membro.funcao,
      dataEntrada: membro.dataEntrada,
    };
  }

  async buscarPorUsuarioECirculo(
    usuarioId: string,
    circuloId: string,
  ): Promise<MembroCirculo | null> {
    const membro = await this.repository.findOne({
      where: { usuarioId, circuloId },
    });

    return membro ? this.paraDominio(membro) : null;
  }

  async listarPorCirculo(circuloId: string): Promise<MembroCirculo[]> {
    const membros = await this.repository.find({
      where: { circuloId },
      order: {
        dataEntrada: 'ASC',
        id: 'ASC',
      },
    });

    return membros.map((membro) => this.paraDominio(membro));
  }
}
