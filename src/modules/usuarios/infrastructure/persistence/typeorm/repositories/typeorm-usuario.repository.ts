import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { UsuarioRepository } from '../../../../domain/repositories/usuario.repository.js';
import type { Usuario } from '../../../../domain/entities/usuario.entity.js';

import { UsuarioOrmEntity } from '../entitites/usuario.orm-entity.js';

import type {
  AtualizarUsuarioData,
} from '../../../../domain/repositories/usuario.repository.js';




@Injectable()
export class TypeOrmUsuarioRepository implements UsuarioRepository {
  constructor(
    @InjectRepository(UsuarioOrmEntity)
    private readonly repository: Repository<UsuarioOrmEntity>,
  ) {}

  async buscarPorId(id: string): Promise<Usuario | null> {
    const usuario = await this.repository.findOne({
      where: { id },
    });

    if (!usuario) {
      return null;
    }

    return {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      telefone: usuario.telefone,
      fotoUrl: usuario.fotoUrl,
      tipoUsuario: usuario.tipoUsuario,
    };
  }

  async atualizar(
  id: string,
  dados: AtualizarUsuarioData,
): Promise<Usuario | null> {
  /**
   * Buscamos a entidade para verificar se o usuário
   * realmente existe antes de atualizar.
   */
  const usuario = await this.repository.findOne({
    where: { id },
  });

  if (!usuario) {
    return null;
  }

  /**
   * Aplicamos somente os campos enviados.
   *
   * undefined significa que o campo não deve
   * ser alterado.
   */
  if (dados.nome !== undefined) {
    usuario.nome = dados.nome;
  }

  if (dados.telefone !== undefined) {
    usuario.telefone = dados.telefone;
  }

  if (dados.fotoUrl !== undefined) {
    usuario.fotoUrl = dados.fotoUrl;
  }

  await this.repository.save(usuario);

  /**
   * Reutilizamos a consulta existente para manter
   * o mapeamento da entidade ORM para o domínio.
   */
  return this.buscarPorId(id);
}








}