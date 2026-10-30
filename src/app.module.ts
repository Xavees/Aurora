import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

import { DatabaseModule } from './config/database/database.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { UsuariosModule } from './modules/usuarios/usuarios.module.js';
import { AuthModule } from './modules/auth/auth.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // Limita a quantidade de requisições por cliente
    ThrottlerModule.forRoot([
      {
        ttl: 60_000, // Janela de 60 segundos
        limit: 60,   // Máximo de 60 requisições
      },
    ]),

    DatabaseModule,
    UsuariosModule,
    AuthModule,
  ],

  controllers: [AppController],

  providers: [
    AppService,

    // Aplica o ThrottlerGuard globalmente em todas as rotas
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}