import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContatoEmergenciaOrmEntity } from './entities/contato-emergencia.orm-entity.js';
import { TypeOrmContatoEmergenciaRepository } from './repositories/contato-emergencia.orm-repository.js';
import { CONTATO_EMERGENCIA_REPOSITORY } from '../../../domain/repositories/contato-emergencia.repository.token.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([ContatoEmergenciaOrmEntity]),
  ],

  providers: [
    {
      provide: CONTATO_EMERGENCIA_REPOSITORY,
      useClass: TypeOrmContatoEmergenciaRepository,
    },
  ],

  exports: [CONTATO_EMERGENCIA_REPOSITORY],
})
export class ContatosPersistenceModule {}
