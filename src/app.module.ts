
import { Module } from '@nestjs/common';
import type { NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

import { DatabaseModule } from './config/database/database.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { UsuariosModule } from './modules/usuarios/usuarios.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { ContatosEmergenciaModule } from './modules/contatos-emergencia/contatos-emergencia.module.js';
import { RequestLoggerMiddleware } from './common/middlewares/request-logger.middleware.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // Limita a quantidade de requisições por cliente.
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 60,
      },
    ]),

    DatabaseModule,
    UsuariosModule,
    AuthModule,
    ContatosEmergenciaModule,
  ],

  controllers: [AppController],

  providers: [
    AppService,
    ThrottlerGuard,

    // Aplica o limite de requisições globalmente.
    {
      provide: APP_GUARD,
      useExisting: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(RequestLoggerMiddleware)
      .forRoutes('*');
  }
}
