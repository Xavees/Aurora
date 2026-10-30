import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UsuarioOrmEntity } from './infrastructure/persistence/typeorm/entitites/usuario.orm-entity.js';

import { TypeOrmUsuarioRepository } from './infrastructure/persistence/typeorm/repositories/typeorm-usuario.repository.js';

import { USUARIO_REPOSITORY } from './domain/repositories/usuario.repository.token.js';

import { BuscarUsuarioUseCase } from './application/use-cases/buscar-usuario.use-case.js';
import { UsuariosController } from './presetantion/http/usuarios.controller.js';
import { AuthModule } from '../auth/auth.module.js';
import { AtualizarUsuarioUseCase } from './application/use-cases/atualizar-usuario.use-case.js';


@Module({
  imports: [
    TypeOrmModule.forFeature([UsuarioOrmEntity]),
    AuthModule,
  ],

  controllers:[UsuariosController],

  providers: [
    BuscarUsuarioUseCase,AtualizarUsuarioUseCase,

    /**
     * Custom Provider:
     *
     * Quando uma classe solicitar USUARIO_REPOSITORY,
     * o NestJS fornecerá uma instância de
     * TypeOrmUsuarioRepository.
     */
    {
      provide: USUARIO_REPOSITORY,
      useClass: TypeOrmUsuarioRepository,
    },
  ],

  exports: [BuscarUsuarioUseCase],
})
export class UsuariosModule {}