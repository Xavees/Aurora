
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CirculoOrmEntity } from './entities/circulo.orm-entity.js';
import { MembroCirculoOrmEntity } from './entities/membro-circulo.orm-entity.js';

import { TypeOrmCirculoRepository } from './repositories/typeorm-circulo.repository.js';
import { TypeOrmMembroCirculoRepository } from './repositories/typeorm-membro-circulo.repository.js';
import { TypeOrmCriarCirculoTransacionalRepository } from './repositories/typeorm-criar-circulo-transacional.repository.js';
import { TypeOrmSairCirculoTransacionalRepository } from './repositories/typeorm-sair-circulo-transacional.repository.js';

import { CIRCULO_REPOSITORY } from '../../../domain/repositories/circulo.repository.token.js';
import { MEMBRO_CIRCULO_REPOSITORY } from '../../../domain/repositories/membro-circulo.repository.token.js';
import { CRIAR_CIRCULO_TRANSACIONAL_REPOSITORY } from '../../../domain/repositories/criar-circulo-transacional.repository.token.js';
import { SAIR_CIRCULO_TRANSACIONAL_REPOSITORY } from '../../../domain/repositories/sair-circulo-transacional.repository.token.js';
import { TypeOrmRemoverMembroTransacionalRepository } from './repositories/typeorm-remover-membro-transacional.repository.js';
import { REMOVER_MEMBRO_TRANSACIONAL_REPOSITORY } from '../../../domain/repositories/remover-membro-transacional.repository.token.js';
import { TypeOrmAlterarFuncaoMembroTransacionalRepository } from './repositories/typeorm-alterar-funcao-membro-transacional.repository.js';
import { ALTERAR_FUNCAO_MEMBRO_TRANSACIONAL_REPOSITORY } from '../../../domain/repositories/alterar-funcao-membro-transacional.repository.token.js';
import { ENTRAR_CIRCULO_TRANSACIONAL_REPOSITORY } from '../../../domain/repositories/entrar-circulo-transacional.repository.token.js';
import { TypeOrmEntrarCirculoTransacionalRepository } from './repositories/typeorm-entrar-circulo-transacional.repository.js';
import { TypeOrmRemoverCirculoTransacionalRepository } from './repositories/typeorm-remover-circulo-transacional.repository.js';
import { REMOVER_CIRCULO_TRANSACIONAL_REPOSITORY } from '../../../domain/repositories/remover-circulo-transacional.repository.token.js';
import { TypeOrmAtualizarCirculoTransacionalRepository } from './repositories/typeorm-atualizar-circulo-transacional.repository.js';
import { ATUALIZAR_CIRCULO_TRANSACIONAL_REPOSITORY } from '../../../domain/repositories/atualizar-circulo-transacional.repository.token.js';
import { TypeOrmRenovarCodigoConviteTransacionalRepository } from './repositories/typeorm-renovar-codigo-convite-transacional.repository.js';
import { RENOVAR_CODIGO_CONVITE_TRANSACIONAL_REPOSITORY } from '../../../domain/repositories/renovar-codigo-convite-transacional.repository.token.js';
import { BloqueioCirculoOrmEntity } from './entities/bloqueio-circulo.orm-entity.js';
import { TypeOrmDesbloquearMembroTransacionalRepository } from './repositories/typeorm-desbloquear-membro-transacional.repository.js';
import { DESBLOQUEAR_MEMBRO_TRANSACIONAL_REPOSITORY } from '../../../domain/repositories/desbloquear-membro-transacional.repository.token.js';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      CirculoOrmEntity,
      MembroCirculoOrmEntity,
      BloqueioCirculoOrmEntity,
    ]),
  ],

  providers: [
    {
      provide: CIRCULO_REPOSITORY,
      useClass: TypeOrmCirculoRepository,
    },
    {
      provide: MEMBRO_CIRCULO_REPOSITORY,
      useClass: TypeOrmMembroCirculoRepository,
    },
    {
      provide: CRIAR_CIRCULO_TRANSACIONAL_REPOSITORY,
      useClass: TypeOrmCriarCirculoTransacionalRepository,
    },
    {
      provide: SAIR_CIRCULO_TRANSACIONAL_REPOSITORY,
      useClass: TypeOrmSairCirculoTransacionalRepository,
    },
    {
      provide: REMOVER_MEMBRO_TRANSACIONAL_REPOSITORY,
      useClass: TypeOrmRemoverMembroTransacionalRepository,
    },
    {
      provide: ALTERAR_FUNCAO_MEMBRO_TRANSACIONAL_REPOSITORY,
      useClass: TypeOrmAlterarFuncaoMembroTransacionalRepository,
    },
    {
      provide: ENTRAR_CIRCULO_TRANSACIONAL_REPOSITORY,
      useClass: TypeOrmEntrarCirculoTransacionalRepository,
    },
    {
      provide:REMOVER_CIRCULO_TRANSACIONAL_REPOSITORY,
      useClass: TypeOrmRemoverCirculoTransacionalRepository,
    },
    {
      provide: ATUALIZAR_CIRCULO_TRANSACIONAL_REPOSITORY,
      useClass: TypeOrmAtualizarCirculoTransacionalRepository,
    },
    {
      provide: RENOVAR_CODIGO_CONVITE_TRANSACIONAL_REPOSITORY,
      useClass: TypeOrmRenovarCodigoConviteTransacionalRepository,
    },
    {
      provide: DESBLOQUEAR_MEMBRO_TRANSACIONAL_REPOSITORY,
      useClass: TypeOrmDesbloquearMembroTransacionalRepository,
    },




    
  ],
    

  exports: [
    CIRCULO_REPOSITORY,
    MEMBRO_CIRCULO_REPOSITORY,
    CRIAR_CIRCULO_TRANSACIONAL_REPOSITORY,
    SAIR_CIRCULO_TRANSACIONAL_REPOSITORY,
    REMOVER_MEMBRO_TRANSACIONAL_REPOSITORY,
    ALTERAR_FUNCAO_MEMBRO_TRANSACIONAL_REPOSITORY,
    ENTRAR_CIRCULO_TRANSACIONAL_REPOSITORY,
    REMOVER_CIRCULO_TRANSACIONAL_REPOSITORY,
    ATUALIZAR_CIRCULO_TRANSACIONAL_REPOSITORY,
    RENOVAR_CODIGO_CONVITE_TRANSACIONAL_REPOSITORY,
    DESBLOQUEAR_MEMBRO_TRANSACIONAL_REPOSITORY,
  ],
})
export class CirculosPersistenceModule {}
