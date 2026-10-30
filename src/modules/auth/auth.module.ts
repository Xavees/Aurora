import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UsuarioOrmEntity } from '../usuarios/infrastructure/persistence/typeorm/entitites/usuario.orm-entity.js';

import { AUTH_REPOSITORY } from './domain/repositories/auth.repository.token.js';
import { PASSWORD_HASHER } from './application/services/password-hasher.token.js';
import { TOKEN_SERVICE } from './application/services/token-service.token.js';

import { TypeOrmAuthRepository } from './infrastructure/persistence/typeorm/repositories/typeorm-auth.repository.js';

import { Argon2PasswordHasherService } from './infrastructure/security/argon2-password-hasher.service.js';
import { JwtTokenService } from './infrastructure/security/jwt-token.service.js';

import { LoginUseCase } from './application/use-cases/login.use-case.js';
import { CadastroUsuarioUseCase } from './application/use-cases/cadastro-usuario.use-case.js';
import { JwtAuthGuard } from './infrastructure/security/guards/jwt-auth.guard.js';
import { AuthController } from './presentation/http/auth.controller.js';
import { UsuariosPersistenceModule } from '../usuarios/infrastructure/persistence/typeorm/usuarios-persistence.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([UsuarioOrmEntity]), UsuariosPersistenceModule ,

    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');

        if (!secret || secret.length < 32) {
          throw new Error(
            'JWT_SECRET deve conter pelo menos 32 caracteres.',
          );
        }

        return {
          secret,
          signOptions: {
            expiresIn: 900,
            algorithm: 'HS256' as const,
            issuer: 'aurora-api',
            audience: 'aurora-app',
          },
        };
      },
    }),
  ],

  controllers: [AuthController],

  providers: [
    LoginUseCase,
    CadastroUsuarioUseCase,
    JwtAuthGuard,

    {
      provide: AUTH_REPOSITORY,
      useClass: TypeOrmAuthRepository,
    },

    {
      provide: PASSWORD_HASHER,
      useClass: Argon2PasswordHasherService,
    },

    {
      provide: TOKEN_SERVICE,
      useClass: JwtTokenService,
    },
  ],

  // Compartilhamos o Guard e o módulo JWT com outros módulos.
  exports: [
    JwtModule,
    JwtAuthGuard,
  ],
})
export class AuthModule {}