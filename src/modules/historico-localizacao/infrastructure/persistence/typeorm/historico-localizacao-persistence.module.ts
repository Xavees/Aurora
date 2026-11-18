import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HistoricoLocalizacaoOrmEntity } from './entities/historico-localizacao.orm-entity.js';
import { TypeOrmHistoricoLocalizacaoRepository } from './repositories/typeorm-historico-localizacao.repository.js';
import { HISTORICO_LOCALIZACAO_REPOSITORY } from '../../../domain/repositories/historico-localizacao.repository.token.js';


@Module({
  imports: [
    TypeOrmModule.forFeature([
      HistoricoLocalizacaoOrmEntity,
    ]),
  ],

  providers: [
    {
      provide: HISTORICO_LOCALIZACAO_REPOSITORY,
      useClass: TypeOrmHistoricoLocalizacaoRepository,
    },
  ],

  exports: [
    HISTORICO_LOCALIZACAO_REPOSITORY,
  ],
})
export class HistoricoLocalizacaoPersistenceModule {}
