import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiConflictResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateExportDto } from '../export/dto/create-export.dto';
import { ExportEntity } from '../export/export.entity';
import { ExportProxyService } from './export-proxy.service';

@ApiTags('export')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'export', version: '1' })
export class ExportProxyController {
  constructor(private readonly service: ExportProxyService) {}

  @Post('jobs')
  @ApiOperation({ summary: 'Create an async export job' })
  @ApiOkResponse({ type: Object })
  async createJob(@Body() payload: CreateExportDto, @Req() req: Request): Promise<ExportEntity> {
    return this.service.createJob(payload, req.headers.authorization);
  }

  @Get('jobs/:id')
  @ApiOperation({ summary: 'Get export job status' })
  @ApiOkResponse({ type: Object })
  async findJobStatus(@Param('id') id: string, @Req() req: Request): Promise<ExportEntity> {
    return this.service.findJobStatus(id, req.headers.authorization);
  }

  @Get('jobs/:id/download')
  @ApiOperation({ summary: 'Download generated export file when completed' })
  @ApiOkResponse({ type: Object })
  @ApiConflictResponse({ description: 'Export job is not completed yet.' })
  @Header('Content-Type', 'application/pdf')
  async download(@Param('id') id: string, @Req() req: Request, @Res() res: Response): Promise<void> {
    const result = await this.service.download(id, req.headers.authorization);

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', result.contentDisposition);
    res.send(result.body);
  }
}
