import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { Logger } from 'nestjs-pino';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor(
    private readonly configService: ConfigService,
    private readonly logger: Logger,
  ) {
    super();
  }

  async onModuleInit(): Promise<void> {
    if (this.configService.get<boolean>('app.mockMode', false)) {
      return;
    }

    try {
      await this.$connect();
      this.logger.log(
        {
          module: 'database',
          operation: 'prisma.connect',
          startupMode: this.configService.get<'fail-fast' | 'warn'>('database.startupMode', 'warn'),
        },
        'database.connected',
      );
    } catch (error) {
      const startupMode = this.configService.get<'fail-fast' | 'warn'>(
        'database.startupMode',
        'warn',
      );
      const reason = (error as Error).message;

      if (startupMode === 'fail-fast') {
        this.logger.error(
          {
            module: 'database',
            operation: 'prisma.connect',
            startupMode,
            reason,
          },
          'database.connection.failed',
        );
        throw error;
      }

      this.logger.warn(
        {
          module: 'database',
          operation: 'prisma.connect',
          startupMode,
          reason,
        },
        'database.connection.skipped',
      );
    }
  }
}
