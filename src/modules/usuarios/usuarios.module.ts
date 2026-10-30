import { Module } from '@nestjs/common';

import { UsuariosPersistenceModule } from './infrastructure/persistence/typeorm/usuarios-persistence.module.js';

import { BuscarUsuarioUseCase } from './application/use-cases/buscar-usuario.use-case.js';
import { AtualizarUsuarioUseCase } from './application/use-cases/atualizar-usuario.use-case.js';
import { DesativarUsuarioUseCase } from './application/use-cases/desativar-usuario.use-case.js';

import { UsuariosController } from './presetantion/http/usuarios.controller.js';

import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [
    UsuariosPersistenceModule,
    AuthModule,
  ],

  controllers: [
    UsuariosController,
  ],

  providers: [
    BuscarUsuarioUseCase,
    AtualizarUsuarioUseCase,
    DesativarUsuarioUseCase,
  ],

  exports: [
    BuscarUsuarioUseCase,
  ],
})
export class UsuariosModule {}