import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { databaseConfig } from './database.config.js';

@Module({
  imports: [
    ConfigModule.forFeature(databaseConfig),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],

      inject: [ConfigService],

      useFactory: (configService: ConfigService) => {
        const database = configService.getOrThrow<string>(
          'database.database',
        );

        // Proteção contra execução de testes E2E
        // em um banco diferente do ambiente de testes.
        if (
          process.env.NODE_ENV === 'test' &&
          database !== 'aurora_test'
        ) {
          throw new Error(
            'Testes E2E só podem utilizar o banco aurora_test.',
          );
        }

        return {
          type: 'mysql' as const,

          host: configService.getOrThrow<string>('database.host'),
          port: configService.getOrThrow<number>('database.port'),

          username: configService.getOrThrow<string>('database.username'),
          password: configService.getOrThrow<string>('database.password'),
          database,

          autoLoadEntities: true,
          synchronize: false,
        };
      },
    }),
  ],
})
export class DatabaseModule {}