
import { Module } from '@nestjs/common';

import { CirculosPersistenceModule } from './infrastructure/persistence/typeorm/circulos-persistence.module.js';

// Casos de uso: gerenciamento dos círculos.
import { CriarCirculoUseCase } from './application/use-cases/criar-circulo.use-case.js';
import { ListarCirculosUseCase } from './application/use-cases/listar-circulos.use-case.js';
import { BuscarCirculoUseCase } from './application/use-cases/buscar-circulo.use-case.js';
import { AtualizarCirculoUseCase } from './application/use-cases/atualizar-circulo.use-case.js';
import { RemoverCirculoUseCase } from './application/use-cases/remover-circulo.use-case.js';

// Casos de uso: gerenciamento dos participantes.
import { EntrarCirculoUseCase } from './application/use-cases/entrar-circulo.use-case.js';
import { ListarMembrosCirculoUseCase } from './application/use-cases/listar-membros-circulo.use-case.js';
import { SairCirculoUseCase } from './application/use-cases/sair-circulo.use-case.js';
import { RemoverMembroCirculoUseCase } from './application/use-cases/remover-membro-circulo.use-case.js';
import { CirculosController } from './presentation/circulos.controller.js';
import { AuthModule } from '../auth/auth.module.js';
import { UsuariosPersistenceModule } from '../usuarios/infrastructure/persistence/typeorm/usuarios-persistence.module.js';
import { AlterarFuncaoMembroCirculoUseCase } from './application/use-cases/alterar-funcao-membro-circulo.use-case.js';
import { RenovarCodigoConviteUseCase } from './application/use-cases/renovar-codigo-convite.use-case.js';
import { DesbloquearMembroCirculoUseCase } from './application/use-cases/desbloquear-membro-circulo.use-case.js';

@Module({
  imports: [
    // Disponibiliza os repositories e seus tokens.
    CirculosPersistenceModule,AuthModule, UsuariosPersistenceModule,
  ],

  controllers: [CirculosController],

  // O NestJS gerencia a criação e a injeção desses casos de uso.
  providers: [
    CriarCirculoUseCase,
    ListarCirculosUseCase,
    BuscarCirculoUseCase,
    AtualizarCirculoUseCase,
    RemoverCirculoUseCase,
    EntrarCirculoUseCase,
    ListarMembrosCirculoUseCase,
    SairCirculoUseCase,
    RemoverMembroCirculoUseCase,
    AlterarFuncaoMembroCirculoUseCase,
    RenovarCodigoConviteUseCase,
    DesbloquearMembroCirculoUseCase,
  ],
})
export class CirculosModule {}
