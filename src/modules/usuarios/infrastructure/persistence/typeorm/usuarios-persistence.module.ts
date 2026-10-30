import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UsuarioOrmEntity } from './entitites/usuario.orm-entity.js';

import { TypeOrmUsuarioRepository } from './repositories/typeorm-usuario.repository.js';

import { USUARIO_REPOSITORY } from '../../../domain/repositories/usuario.repository.token.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([UsuarioOrmEntity]),
  ],

  providers: [
    {
      provide: USUARIO_REPOSITORY,
      useClass: TypeOrmUsuarioRepository,
    },
  ],

  exports: [
    USUARIO_REPOSITORY,
  ],
})
export class UsuariosPersistenceModule {}