
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UsuarioOrmEntity } from './entities/usuario.orm-entity.js';

import { TypeOrmUsuarioRepository } from './repositories/typeorm-usuario.repository.js';
import { TypeOrmDesativarUsuarioTransacionalRepository } from './repositories/typeorm-desativar-usuario-transacional.repository.js';

import { USUARIO_REPOSITORY } from '../../../domain/repositories/usuario.repository.token.js';
import { DESATIVAR_USUARIO_TRANSACIONAL_REPOSITORY } from '../../../domain/repositories/desativar-usuario-transacional.repository.token.js';

@Module({
  imports: [TypeOrmModule.forFeature([UsuarioOrmEntity])],

  providers: [
    {
      provide: USUARIO_REPOSITORY,
      useClass: TypeOrmUsuarioRepository,
    },
    {
      provide: DESATIVAR_USUARIO_TRANSACIONAL_REPOSITORY,
      useClass: TypeOrmDesativarUsuarioTransacionalRepository,
    },
  ],

  exports: [
    USUARIO_REPOSITORY,
    DESATIVAR_USUARIO_TRANSACIONAL_REPOSITORY,
  ],
})
export class UsuariosPersistenceModule {}
