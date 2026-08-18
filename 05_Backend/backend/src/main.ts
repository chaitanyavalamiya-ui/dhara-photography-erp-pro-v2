import { NestFactory } from '@nestjs/core';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import {
  createHelmetOptions,
  isCorsOriginAllowed,
  parseCorsOrigins,
  payloadContainsPrototypePollution,
} from './common/http-security';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('BACKEND_PORT', 3000);
  const apiPrefix = configService.get<string>('API_PREFIX', 'api/v1');
  const allowedOrigins = parseCorsOrigins(configService.get<string>('CORS_ORIGIN'));

  app.setGlobalPrefix(apiPrefix);
  app.use(helmet(createHelmetOptions()));
  app.use((req: { body?: unknown; query?: unknown; params?: unknown }, _res: unknown, next: (error?: unknown) => void) => {
    if (
      payloadContainsPrototypePollution(req.body) ||
      payloadContainsPrototypePollution(req.query) ||
      payloadContainsPrototypePollution(req.params)
    ) {
      next(new BadRequestException('Invalid request payload.'));
      return;
    }
    next();
  });
  app.enableCors({
    origin: (origin, callback) => {
      if (isCorsOriginAllowed(origin, allowedOrigins)) {
        callback(null, true);
        return;
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  const nodeEnv = configService.get<string>('NODE_ENV', 'development');

  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Dhara Photography ERP Pro V2')
      .setDescription('REST API for Dhara Photography Patan ERP')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(port);
  console.log(`Dhara ERP API running on http://localhost:${port}/${apiPrefix}`);
  if (nodeEnv !== 'production') {
    console.log(`Swagger docs at http://localhost:${port}/api/docs`);
  }
}

bootstrap();
