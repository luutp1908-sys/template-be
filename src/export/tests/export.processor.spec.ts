import { ConflictException } from '@nestjs/common';
import { Job, UnrecoverableError } from 'bullmq';
import { Logger } from 'nestjs-pino';
import { ExportProcessor } from '../export.processor';
import { ExportStatus } from '../export.entity';

describe('ExportProcessor', () => {
  let repository: { findById: jest.Mock; updateStatus: jest.Mock };
  let workerHealthRegistry: { heartbeat: jest.Mock };
  let logger: { log: jest.Mock; warn: jest.Mock; error: jest.Mock };
  let processor: ExportProcessor;

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      updateStatus: jest.fn(),
    };
    workerHealthRegistry = {
      heartbeat: jest.fn(),
    };
    logger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    processor = new ExportProcessor(
      repository as any,
      workerHealthRegistry as any,
      logger as unknown as Logger,
    );
  });

  it('should rethrow retryable failures for BullMQ retries', async () => {
    repository.findById.mockResolvedValue({ id: 'export-1', fileName: 'file.pdf' });

    const transientError = new Error('Temporary storage write failure');
    repository.updateStatus.mockImplementation(async (_id: string, status: string) => {
      if (status === ExportStatus.COMPLETED) {
        throw transientError;
      }
      return { id: 'export-1', status };
    });

    const job = { data: { exportId: 'export-1' }, attemptsMade: 0 } as Job<{ exportId: string }>;

    let thrown: unknown;
    try {
      await processor.process(job);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBe(transientError);
    expect(thrown).not.toBeInstanceOf(UnrecoverableError);
    expect(repository.updateStatus).toHaveBeenCalledWith('export-1', ExportStatus.FAILED, {
      status: ExportStatus.FAILED,
      errorMessage: 'Temporary storage write failure',
      attemptCount: 1,
    });
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        module: 'queue',
        operation: 'export.process',
        queue: 'pdf-export',
        exportId: 'export-1',
        attemptCount: 1,
        failureType: 'retryable',
      }),
      'queue.job.failed.retryable',
    );
  });

  it('should throw UnrecoverableError for terminal failures', async () => {
    repository.findById.mockResolvedValue({ id: 'export-2', fileName: 'file.pdf' });

    repository.updateStatus.mockImplementation(async (_id: string, status: string) => {
      if (status === ExportStatus.PROCESSING) {
        throw new ConflictException('Invalid export status transition');
      }
      return { id: 'export-2', status };
    });

    const job = { data: { exportId: 'export-2' }, attemptsMade: 1 } as Job<{ exportId: string }>;

    let thrown: unknown;
    try {
      await processor.process(job);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(UnrecoverableError);
    expect((thrown as Error).message).toBe('Invalid export status transition');
    expect(repository.updateStatus).toHaveBeenCalledWith('export-2', ExportStatus.FAILED, {
      status: ExportStatus.FAILED,
      errorMessage: 'Invalid export status transition',
      attemptCount: 2,
    });
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        module: 'queue',
        operation: 'export.process',
        queue: 'pdf-export',
        exportId: 'export-2',
        attemptCount: 2,
        failureType: 'terminal',
      }),
      'queue.job.failed.terminal',
    );
  });
});
