import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.use(helmet());

  const config = app.get(ConfigService);
  const apiPrefix = config.get<string>('app.apiPrefix', 'api');
  const swaggerPath = config.get<string>('app.swaggerPath', 'docs');

  app.setGlobalPrefix(apiPrefix);
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  const trustProxy = config.get<number>('app.trustProxy', 0);
  if (trustProxy > 0) {
    const httpAdapter = app.getHttpAdapter();
    const adapterInstance = httpAdapter.getInstance();
    if (adapterInstance && typeof adapterInstance.set === 'function') {
      adapterInstance.set('trust proxy', trustProxy);
    }
  }

  const configuredOrigin = config.get<string>('app.frontendOrigin') || process.env.FRONTEND_ORIGIN || '';
  const localOrigins = ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000'];
  const allowedOrigins = configuredOrigin
    ? configuredOrigin.split(',').map((origin) => origin.trim()).filter(Boolean)
    : localOrigins;

  const isProduction = config.get<string>('app.nodeEnv', 'development') === 'production';
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (isProduction) {
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error(`Origin ${origin} not allowed by CORS`));
        return;
      }

      if (allowedOrigins.includes(origin) || localOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(null, true);
    },
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Template SaaS API')
    .setDescription('Production-ready backend foundation')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(swaggerPath, app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = config.get<number>('app.port', 4000);
  // cookie parser for httpOnly cookie auth flows
  app.use(cookieParser());
  // enable graceful shutdown hooks so Nest can close resources on restart
  // (useful when running with --watch to avoid orphaned processes)
  app.enableShutdownHooks();
  await app.listen(port);
}

void bootstrap();
