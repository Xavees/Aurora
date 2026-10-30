import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';

import type {
  AuthRepository,
  CriarUsuarioData,
} from '../../../../domain/repositories/auth.repository.js';
import type { CredencialUsuario } from '../../../../domain/entitites/credencial-usuario.entity.js';

import { UsuarioOrmEntity } from '../../../../../usuarios/infrastructure/persistence/typeorm/entitites/usuario.orm-entity.js';

@Injectable()
export class TypeOrmAuthRepository implements AuthRepository {
  constructor(
    @InjectRepository(UsuarioOrmEntity)
    private readonly repository: Repository<UsuarioOrmEntity>,
  ) {}

  async buscarPorEmail(email: string): Promise<CredencialUsuario | null> {
    const usuario = await this.repository.findOne({
      where: { email },
    });

    if (!usuario) {
      return null;
    }

    /**
     * Retornamos somente os dados necessários para o login.
     * Não devolvemos a entidade TypeORM inteira.
     */
    return {
      id: usuario.id,
      email: usuario.email,
      senhaHash: usuario.senha,
    };
  }

 async criarUsuario(dados: CriarUsuarioData): Promise<string> {
  const novoUsuario = this.repository.create({
    nome: dados.nome,
    email: dados.email,
    senha: dados.senhaHash,
    firebaseUid: null,
  });

  try {
    const usuarioSalvo = await this.repository.save(novoUsuario);

    return usuarioSalvo.id;
  } catch (error: unknown) {
    /**
     * O MySQL utiliza o código 1062 (ER_DUP_ENTRY)
     * quando uma restrição UNIQUE é violada.
     *
     * Tratamos esse erro sem retornar mensagens
     * internas do banco ao cliente.
     */
    if (error instanceof QueryFailedError) {
      const driverError = error.driverError as {
        code?: string;
        errno?: number;
      };

      if (
        driverError.code === 'ER_DUP_ENTRY' ||
        driverError.errno === 1062
      ) {
        throw new ConflictException(
          'Já existe um cadastro com um dos dados informados.',
        );
      }
    }

    // Erros desconhecidos seguem para o filtro global.
    throw error;
  }
}







}