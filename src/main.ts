import type { NestExpressApplication } from '@nestjs/platform-express';
import { pastaFotos } from './modules/usuarios/presetantion/http/foto-perfil.service.js';

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module.js';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Somente imagens WebP geradas pelo servidor são publicadas nesta pasta.
  app.useStaticAssets(pastaFotos(), {
    prefix: '/uploads/perfis/',
    index: false,
    dotfiles: 'deny',
    setHeaders: (res) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'public, max-age=86400');
    },
  });

  // Tratamento global de erros.
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Validação global dos dados recebidos pela API.
  app.useGlobalPipes(
    new ValidationPipe({
      // Remove propriedades desconhecidas.
      whitelist: true,

      // Rejeita propriedades não permitidas nos DTOs.
      forbidNonWhitelisted: true,

      // Permite transformações declaradas explicitamente.
      transform: true,

      transformOptions: {
        enableImplicitConversion: false,
      },
    }),
  );

  /**
   * Configuração da documentação OpenAPI.
   *
   * O esquema Bearer permite informar um JWT
   * pelo botão Authorize do Swagger UI.
   */
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Aurora API')
    .setDescription(
      'API REST do Aurora: segurança pessoal, círculos, contatos, localização e áreas de risco.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const documento = SwaggerModule.createDocument(
    app,
    swaggerConfig,
  );

  // Disponibiliza a documentação interativa.
  SwaggerModule.setup('api/docs', app, documento);

  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();

