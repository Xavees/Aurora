
import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';

import { UsuariosPersistenceModule } from '../usuarios/infrastructure/persistence/typeorm/usuarios-persistence.module.js';

import { AreasRiscoPersistenceModule } from './infrastructure/persistence/typeorm/areas-risco-persistence.module.js';

import { ListarAreasRiscoUseCase } from './application/use-cases/listar-areas-risco.use-case.js';

import { BuscarAreaRiscoPorIdUseCase } from './application/use-cases/buscar-area-risco-por-id.use-case.js';

import { AreasRiscoController } from './presentation/areas-risco.controller.js';
import { CriarAreaRiscoUseCase } from './application/use-cases/criar-area-risco.use-case.js';
import { AtualizarAreaRiscoUseCase } from './application/use-cases/atualizar-area-risco.use-case.js';
import { ExcluirAreaRiscoUseCase } from './application/use-cases/excluir-area-risco.use-case.js';

/**
 * Módulo principal da funcionalidade Áreas de Risco.
 *
 * Reúne as dependências necessárias para atender
 * às requisições HTTP do módulo.
 */
@Module({
  imports: [
    // Disponibiliza as dependências de autenticação.
    AuthModule,

    // Disponibiliza o repositório de usuários,
    // utilizado pelo JwtAuthGuard.
    UsuariosPersistenceModule,

    // Disponibiliza o repositório de áreas de risco.
    AreasRiscoPersistenceModule,
  ],

  controllers: [
    AreasRiscoController,
  ],

  providers: [
    ListarAreasRiscoUseCase,
    BuscarAreaRiscoPorIdUseCase,
    CriarAreaRiscoUseCase,
    AtualizarAreaRiscoUseCase,
    ExcluirAreaRiscoUseCase,
  ],
})
export class AreasRiscoModule {}
