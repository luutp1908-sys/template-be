import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CreateExportDto } from './dto/create-export.dto';
import { ExportEntity } from './export.entity';
import { ExportService } from './export.service';

@ApiTags('export')
@ApiBearerAuth()
@Controller({ path: 'export', version: '1' })
export class ExportController {
  constructor(private readonly service: ExportService) {}

  @Post()
  create(@Body() payload: CreateExportDto): Promise<ExportEntity> {
    return this.service.create(payload);
  }

  @Get(':id')
  findById(@Param('id') id: string): Promise<ExportEntity | null> {
    return this.service.findById(id);
  }
}
