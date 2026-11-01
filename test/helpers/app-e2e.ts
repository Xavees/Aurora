import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';

import { App } from 'supertest/types.js';
import { AppModule } from '../../src/app.module.js';
import { GlobalExceptionFilter } from '../../src/common/filters/global-exception.filter.js';

import { ThrottlerGuard } from '@nestjs/throttler';

// Desativa o rate limiting somente nos testes E2E
// que não estão verificando limites de requisições.
class ThrottlerGuardE2E extends ThrottlerGuard {
  override async canActivate(): Promise<boolean> {
    return true;
  }
}
// isso permite que burlemos o limite de requisições globalmente, sem precisar alterar o código da aplicação.

export async function criarAppE2E(): Promise<INestApplication<App>> {
  // Inicializa os módulos reais da aplicação.
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(ThrottlerGuard)
    .useClass(ThrottlerGuardE2E)
    .compile();

  const app = moduleFixture.createNestApplication<INestApplication<App>>();

  // Reproduz as configurações globais do main.ts.
  app.useGlobalFilters(new GlobalExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: false,
      },
    }),
  );

  await app.init();

  return app;
}
