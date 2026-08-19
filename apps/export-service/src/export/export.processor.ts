import { Inject } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { ExportStatus } from './export.entity';
import { IExportRepository } from './interfaces/export.repository.interface';
import { EXPORT_REPOSITORY } from './export.tokens';

@Processor('pdf-export')
export class ExportProcessor extends WorkerHost {
  constructor(@Inject(EXPORT_REPOSITORY) private readonly repository: IExportRepository) {
    super();
  }

  async process(job: Job<{ exportId: string }>): Promise<void> {
    const exportId = job.data.exportId;
    const exportJob = await this.repository.findById(exportId);
    if (!exportJob) {
      return;
    }

    await this.repository.updateStatus(exportId, ExportStatus.PROCESSING, {
      status: ExportStatus.PROCESSING,
    });

    try {
      const outDir = join(process.cwd(), 'tmp', 'exports');
      mkdirSync(outDir, { recursive: true });

      const pdfBuffer = Buffer.from('PDF placeholder for export: ' + exportId, 'utf8');
      const filePath = join(outDir, `${exportId}.pdf`);
      writeFileSync(filePath, pdfBuffer);

      await this.repository.updateStatus(exportId, ExportStatus.COMPLETED, {
        status: ExportStatus.COMPLETED,
        downloadPath: filePath,
        fileName: exportJob.fileName,
        completedAt: new Date(),
      });
    } catch (error) {
      await this.repository.updateStatus(exportId, ExportStatus.FAILED, {
        status: ExportStatus.FAILED,
        errorMessage: error instanceof Error ? error.message : 'Unknown PDF export error',
      });
      throw error;
    }
  }
}
