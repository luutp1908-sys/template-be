import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

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

  // Enable CORS. In mock/dev mode allow all origins to ease local development.
  const frontendOrigin = config.get<string>('app.frontendOrigin') || process.env.FRONTEND_ORIGIN
  const isDevAllowAll = config.get<boolean>('app.mockMode', false) || process.env.NODE_ENV !== 'production'
  if (isDevAllowAll) {
    app.enableCors({ origin: true, credentials: true })
  } else {
    app.enableCors({ origin: frontendOrigin || false, credentials: true })
  }

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
  await app.listen(port);
}

void bootstrap();
