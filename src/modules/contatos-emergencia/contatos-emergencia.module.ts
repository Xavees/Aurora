
import { Module } from '@nestjs/common';

import { ContatosPersistenceModule } from './infrastructure/persistence/typeorm/contatos-persistence.module.js';

import { ContatosEmergenciaController } from './presentation/contatos-emergencia.controller.js';

import { CriarContatoUseCase } from './application/use-cases/criar-contato.use-case.js';
import { ListarContatosUseCase } from './application/use-cases/listar-contatos.use-case.js';
import { AtualizarContatoUseCase } from './application/use-cases/atualizar-contato.use-case.js';
import { RemoverContatoUseCase } from './application/use-cases/remover-contato.use-case.js';
import { AuthModule } from '../auth/auth.module.js';
import { UsuariosPersistenceModule } from '../usuarios/infrastructure/persistence/typeorm/usuarios-persistence.module.js';
@Module({
  imports: [AuthModule,ContatosPersistenceModule,UsuariosPersistenceModule],

  controllers: [ContatosEmergenciaController],

  providers: [
    CriarContatoUseCase,
    ListarContatosUseCase,
    AtualizarContatoUseCase,
    RemoverContatoUseCase,
  ],
})
export class ContatosEmergenciaModule {}
