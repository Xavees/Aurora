import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ValidationPipe } from '@nestjs/common';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter.js';










async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  
  app.useGlobalFilters(new GlobalExceptionFilter);
app.useGlobalPipes(new ValidationPipe({
   // Remove propriedades que não estejam declaradas nos DTOs
    // com decorators de validação.
    whitelist: true,

    // Rejeita propriedades desconhecidas, em vez de ignorá-las.
    forbidNonWhitelisted: true,

    // Permite transformar valores recebidos em tipos definidos nos DTOs.
    transform: true,

    transformOptions: {
      // Evita conversões automáticas implícitas indesejadas.
      enableImplicitConversion: false,
}}),);


  
  
  
  
  
  
  
  
  
  
  
  
  await app.listen(process.env.PORT ?? 3000);















}

void bootstrap();