import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { LivenessController } from './liveness.controller';

@Module({
  controllers: [LivenessController, HealthController],
})
export class HealthModule {}
