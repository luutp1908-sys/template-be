import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { QueueHealthService } from './queue-health.service';
import { WorkerHealthRegistry } from './worker-health.registry';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const tls = configService.get<boolean>('redis.tls', false);

        return {
          connection: {
            host: configService.get<string>('redis.host', 'localhost'),
            port: configService.get<number>('redis.port', 6379),
            password: configService.get<string>('redis.password') || undefined,
            tls: tls ? {} : undefined,
          },
        };
      },
    }),
  ],
  providers: [QueueHealthService, WorkerHealthRegistry],
  exports: [BullModule, QueueHealthService, WorkerHealthRegistry],
})
export class QueueModule {}
