
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AreaRiscoOrmEntity } from './entities/area-risco.orm-entity.js';

import { TypeOrmAreaRiscoRepository } from './repositories/typeorm-area-risco.repository.js';

import { AREA_RISCO_REPOSITORY } from '../../../domain/repositories/area-risco.repository.token.js';

/**
 * Módulo responsável pela persistência das áreas de risco.
 *
 * Centraliza a configuração do TypeORM e disponibiliza
 * o repositório para a camada de aplicação.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([AreaRiscoOrmEntity]),
  ],

  providers: [
    {
      provide: AREA_RISCO_REPOSITORY,
      useClass: TypeOrmAreaRiscoRepository,
    },
  ],

  exports: [
    AREA_RISCO_REPOSITORY,
  ],
})
export class AreasRiscoPersistenceModule {}
