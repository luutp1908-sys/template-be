import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CreateEditorTypeDto } from './dto/create-editor-type.dto';
import { EditorTypeEntity } from './editor-type.entity';
import { EditorTypeService } from './editor-type.service';

@ApiTags('editor-type')
@ApiBearerAuth()
@Controller({ path: 'editor-type', version: '1' })
export class EditorTypeController {
  constructor(private readonly service: EditorTypeService) {}

  @Post()
  create(@Body() payload: CreateEditorTypeDto): Promise<EditorTypeEntity> {
    return this.service.create(payload);
  }

  @Get(':id')
  findById(@Param('id') id: string): Promise<EditorTypeEntity | null> {
    return this.service.findById(id);
  }
}
