
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { Circulo } from '../../../../domain/entities/circulo.entity.js';
import type { CirculoRepository } from '../../../../domain/repositories/circulo.repository.js';

import { CirculoOrmEntity } from '../entities/circulo.orm-entity.js';
import { MembroCirculoOrmEntity } from '../entities/membro-circulo.orm-entity.js';

@Injectable()
export class TypeOrmCirculoRepository implements CirculoRepository {
  constructor(
    @InjectRepository(CirculoOrmEntity)
    private readonly repository: Repository<CirculoOrmEntity>,
  ) {}

  private paraDominio(circulo: CirculoOrmEntity): Circulo {
    return {
      id: circulo.id,
      nome: circulo.nome,
      codigoConvite: circulo.codigoConvite,
      dataCriacao: circulo.dataCriacao,
    };
  }

  async buscarPorId(id: string): Promise<Circulo | null> {
    const circulo = await this.repository.findOne({
      where: { id },
    });

    return circulo ? this.paraDominio(circulo) : null;
  }

  async buscarPorCodigoConvite(
    codigoConvite: string,
  ): Promise<Circulo | null> {
    const circulo = await this.repository.findOne({
      where: { codigoConvite },
    });

    return circulo ? this.paraDominio(circulo) : null;
  }

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
}
