import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
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
import { AiModule } from './ai/ai.module';
import { HealthModule } from './common/health/health.module';
import configuration from './config/configuration';
import { validateEnv } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { QueueModule } from './queue/queue.module';
import { RequestLoggingMiddleware } from './common/middleware/request-logging.middleware';
import { AuthenticationMiddleware } from './auth/middleware/authentication.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [configuration],
      validate: validateEnv,
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'warn',
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
    DatabaseModule,
    ...(process.env.MOCK_MODE === 'true' ? [] : [QueueModule]),
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
    ExportModule,
    AiModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(AuthenticationMiddleware, RequestLoggingMiddleware).forRoutes('*');
  }
}
