import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { HttpExceptionFilter } from './common/errors/http-exception.filter';
import { validationExceptionFactory } from './common/errors/validation-exception.factory';
import { json } from 'express';
import process from 'process';
import { SocketIoRedisAdapter } from './modules/socket-io-redis-adapter/socket-io-redis-adapter';
import {
  createHttpCorsOptions,
  createSocketCorsOptions,
  getClientOrigins,
  getRequiredEnv,
  isSwaggerEnabled,
} from './config/app.config';
import type { NextFunction, Request, Response } from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const redisIoAdapter = new SocketIoRedisAdapter(
    app,
    getRequiredEnv('REDIS_URL'),
    {
      cors: createSocketCorsOptions(),
    },
  );

  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  app.use(json());
  app.use(cookieParser(getRequiredEnv('COOKIE_SECRET')));

  app.enableCors(createHttpCorsOptions());

  const allowedOrigins = getClientOrigins();

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) {
      next();
      return;
    }

    const origin = req.headers.origin;

    if (origin && !allowedOrigins.includes(origin)) {
      res.status(403).json({
        message: 'Invalid request origin',
      });
      return;
    }

    next();
  });

  app.useGlobalFilters(new HttpExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: validationExceptionFactory,
    }),
  );

  if (isSwaggerEnabled()) {
    const config = new DocumentBuilder()
      .setTitle('Callover API')
      .setDescription('Documentation for Callover API')
      .setVersion('1.0')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
  }

  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
