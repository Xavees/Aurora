import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import type { UsuarioRepository } from '../../../../domain/repositories/usuario.repository.js';
import type { Usuario } from '../../../../domain/entities/usuario.entity.js';
import { UsuarioOrmEntity } from '../entities/usuario.orm-entity.js';
import type { AtualizarUsuarioData } from '../../../../domain/repositories/usuario.repository.js';
import { ConflictException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';


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


try {
  await this.repository.save(usuario);
} catch (erro: unknown) {
  /**
   * O MariaDB utiliza ER_DUP_ENTRY para indicar
   * violação de uma restrição UNIQUE.
   *
   * Também verificamos o nome da restrição para
   * não tratar duplicidade de e-mail ou outro campo
   * como se fosse um conflito de telefone.
   */
  if (erro instanceof QueryFailedError) {
    const driverError = erro.driverError as {
      code?: string;
      errno?: number;
      sqlMessage?: string;
    };

    const telefoneDuplicado =
      (driverError.code === 'ER_DUP_ENTRY' ||
        driverError.errno === 1062) &&
      driverError.sqlMessage?.includes("for key 'telefone'")
    if (telefoneDuplicado) {
      throw new ConflictException('Telefone já cadastrado.');
    }
  }

  // Outros erros devem continuar sendo tratados normalmente.
  throw erro;
}

    /**
     * Reutilizamos a consulta existente para manter
     * o mapeamento da entidade ORM para o domínio.
     */
    return this.buscarPorId(id);
  }
  async desativar(id: string): Promise<boolean> {
    /**
     * O softDelete() preenche automaticamente
     * a coluna excluido_em, sem remover a linha.
     *
     * A condição excluidoEm: IsNull() impede que
     * uma conta já desativada seja alterada novamente.
     */
    const resultado = await this.repository.softDelete({
      id,
      excluidoEm: IsNull(),
    });

    return (resultado.affected ?? 0) > 0;
  }
}
