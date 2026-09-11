import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller({ path: 'health', version: '1' })
export class LivenessController {
  @Get()
  check(): { status: string } {
    return { status: 'ok' };
  }

  @Get('live')
  live(): { status: string } {
    return { status: 'ok' };
  }
}
