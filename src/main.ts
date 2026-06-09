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
  createSocketCorsOptions,
  getClientOrigins,
  getRequiredEnv,
  isSwaggerEnabled,
} from './config/app.config';

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
  app.useGlobalFilters(new HttpExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: validationExceptionFactory,
    }),
  );

  app.use(cookieParser(getRequiredEnv('COOKIE_SECRET')));

  const clientOrigins = getClientOrigins();

  app.enableCors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      if (clientOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    credentials: true,
  });

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
// eslint-disable-next-line @typescript-eslint/no-floating-promises
bootstrap();
