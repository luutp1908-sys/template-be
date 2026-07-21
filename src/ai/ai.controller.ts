import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CreateAiDto } from './dto/create-ai.dto';
import { AiEntity } from './ai.entity';
import { AiService } from './ai.service';

@ApiTags('ai')
@ApiBearerAuth()
@Controller({ path: 'ai', version: '1' })
export class AiController {
  constructor(private readonly service: AiService) {}

  @Post()
  create(@Body() payload: CreateAiDto): Promise<AiEntity> {
    return this.service.create(payload);
  }

  @Get(':id')
  findById(@Param('id') id: string): Promise<AiEntity | null> {
    return this.service.findById(id);
  }
}
