import {
  Body,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiConflictResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthUser } from '../auth/types/auth-user.type';
import { CreateExportDto } from './dto/create-export.dto';
import { ExportEntity, ExportStatus } from './export.entity';
import { ExportService } from './export.service';

@ApiTags('export')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'export', version: '1' })
export class ExportController {
  constructor(private readonly service: ExportService) {}

  @Post('jobs')
  @ApiOperation({ summary: 'Create an async export job' })
  @ApiOkResponse({ type: Object })
  createJob(
    @Body() payload: CreateExportDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ExportEntity> {
    return this.service.createJob(payload, user.id);
  }

  @Get('jobs/:id')
  @ApiOperation({ summary: 'Get export job status' })
  @ApiOkResponse({ type: Object })
  async findJobStatus(@Param('id') id: string, @CurrentUser() user: AuthUser): Promise<ExportEntity> {
    const exportJob = await this.service.findJobStatus(id, user.id);
    if (!exportJob) {
      throw new NotFoundException('Export job not found');
    }

    return exportJob;
  }

  @Get('jobs/:id/download')
  @ApiOperation({ summary: 'Download generated export file when completed' })
  @ApiOkResponse({ type: Object })
  @ApiConflictResponse({ description: 'Export job is not completed yet.' })
  async download(@Param('id') id: string, @CurrentUser() user: AuthUser): Promise<ExportEntity> {
    const exportJob = await this.service.findJobStatus(id, user.id);
    if (!exportJob) {
      throw new NotFoundException('Export job not found');
    }

    if (exportJob.status !== ExportStatus.COMPLETED || !exportJob.downloadPath) {
      throw new ConflictException('Export job is not completed yet');
    }

    return exportJob;
  }
}
