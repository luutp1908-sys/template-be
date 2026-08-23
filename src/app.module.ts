import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { WorkspaceModule } from './workspace/workspace.module';
import { EditorTypeModule } from './editor-type/editor-type.module';
import { CategoryModule } from './category/category.module';
import { TemplateModule } from './template/template.module';
import { TemplateContentModule } from './template-content/template-content.module';
import { UserDraftModule } from './user-draft/user-draft.module';
import { AssetModule } from './asset/asset.module';
import { TagModule } from './tag/tag.module';
import { SearchModule } from './search/search.module';
import { ExportModule } from './export/export.module';
import { ExportProxyModule } from './export-proxy/export-proxy.module';
import { AiModule } from './ai/ai.module';
import { HealthModule } from './common/health/health.module';
import { CacheModule } from './cache/cache.module';
import configuration from './config/configuration';
import { validateEnv } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { QueueModule } from './queue/queue.module';
import { RequestLoggingMiddleware } from './common/middleware/request-logging.middleware';
import { AuthenticationMiddleware } from './auth/middleware/authentication.middleware';
import { MetricsModule } from './common/metrics/metrics.module';

const useExportProxy = Boolean(process.env.EXPORT_SERVICE_URL?.trim());
const queueEnabled = process.env.QUEUE_ENABLED !== 'false';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [configuration],
      validate: validateEnv,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            name: 'default',
            ttl: configService.get<number>('throttle.default.ttlMs', 60_000),
            limit: configService.get<number>('throttle.default.limit', 120),
            blockDuration: configService.get<number>('throttle.default.blockDurationMs', 120_000),
          },
        ],
      }),
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'warn',
        autoLogging: false,
        quietReqLogger: true,
        transport:
          process.env.NODE_ENV !== 'production'
            ? {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  singleLine: true,
                },
              }
            : undefined,
        redact: ['req.headers.authorization'],
      },
    }),
    CacheModule,
    DatabaseModule,
    MetricsModule,
    ...(process.env.MOCK_MODE === 'true' || !queueEnabled ? [] : [QueueModule]),
    HealthModule,
    AuthModule,
    UserModule,
    WorkspaceModule,
    EditorTypeModule,
    CategoryModule,
    TemplateModule,
    TemplateContentModule,
    UserDraftModule,
    AssetModule,
    TagModule,
    SearchModule,
    ...(useExportProxy ? [ExportProxyModule] : [ExportModule]),
    AiModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(AuthenticationMiddleware).forRoutes('*');
    consumer.apply(RequestLoggingMiddleware).forRoutes('*');
  }
}
