import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CreateTagDto } from './dto/create-tag.dto';
import { TagEntity } from './tag.entity';
import { TagService } from './tag.service';

@ApiTags('tag')
@ApiBearerAuth()
@Controller({ path: 'tag', version: '1' })
export class TagController {
  constructor(private readonly service: TagService) {}

  @Post()
  create(@Body() payload: CreateTagDto): Promise<TagEntity> {
    return this.service.create(payload);
  }

  @Get(':id')
  findById(@Param('id') id: string): Promise<TagEntity | null> {
    return this.service.findById(id);
  }
}
