import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CreateTemplateDto } from './dto/create-template.dto';
import { TemplateEntity } from './template.entity';
import { TemplateService } from './template.service';

@ApiTags('template')
@ApiBearerAuth()
@Controller({ path: 'template', version: '1' })
export class TemplateController {
  constructor(private readonly service: TemplateService) {}

  @Post()
  create(@Body() payload: CreateTemplateDto): Promise<TemplateEntity> {
    return this.service.create(payload);
  }

  @Get(':id')
  findById(@Param('id') id: string): Promise<TemplateEntity | null> {
    return this.service.findById(id);
  }
}
