
import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';

import { HistoricoLocalizacaoPersistenceModule } from './infrastructure/persistence/typeorm/historico-localizacao-persistence.module.js';

import { ListarHistoricoLocalizacaoUseCase } from './application/use-cases/listar-historico-localizacao.use-case.js';

import { BuscarHistoricoLocalizacaoPorIdUseCase } from './application/use-cases/buscar-historico-localizacao-por-id.use-case.js';

import { HistoricoLocalizacaoController } from './presentation/historico-localizacao.js';
import { UsuariosPersistenceModule } from '../usuarios/infrastructure/persistence/typeorm/usuarios-persistence.module.js';

@Module({
  imports: [
    // Disponibiliza a autenticação JWT.
    AuthModule,

    // Disponibiliza o repositório de persistência.
    HistoricoLocalizacaoPersistenceModule,
    UsuariosPersistenceModule,
  ],

  controllers: [
    HistoricoLocalizacaoController,
  ],

  providers: [
    ListarHistoricoLocalizacaoUseCase,
    BuscarHistoricoLocalizacaoPorIdUseCase,
  ],
})
export class HistoricoLocalizacaoModule {}
