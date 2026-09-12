import { ConflictException } from '@nestjs/common';
import { Job, UnrecoverableError } from 'bullmq';
import { Logger } from 'nestjs-pino';
import { existsSync, unlinkSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
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

  it('should expose explicit stalled-job recovery defaults for the export worker', () => {
    const workerOptions = ExportProcessor.getWorkerOptions();

    expect(workerOptions).toMatchObject({
      concurrency: 1,
      stalledInterval: 30_000,
      maxStalledCount: 1,
      lockDuration: 60_000,
    });
  });

  it('should delete generated export artifact when a job fails', async () => {
    const exportId = 'export-cleanup-1';
    const artifactPath = join(process.cwd(), 'tmp', 'exports', `${exportId}.pdf`);
    mkdirSync(join(process.cwd(), 'tmp', 'exports'), { recursive: true });
    writeFileSync(artifactPath, 'pdf stub');

    jest.spyOn(require('fs'), 'unlinkSync').mockImplementation(() => undefined);

    repository.findById.mockResolvedValue({ id: exportId, fileName: 'file.pdf' });
    repository.updateStatus.mockImplementation(async (_id: string, status: string) => {
      if (status === ExportStatus.COMPLETED) {
        throw new Error('Temporary render failure');
      }

      return { id: exportId, status };
    });

    const job = {
      data: { exportId },
      attemptsMade: 0,
      opts: { attempts: 3 },
    } as Job<{ exportId: string }>;

    await expect(processor.process(job)).rejects.toThrow('Temporary render failure');

    expect(require('fs').unlinkSync).toHaveBeenCalledWith(artifactPath);
  });

  it('should log retry scheduled for retryable failures with attempts remaining', async () => {
    repository.findById.mockResolvedValue({ id: 'export-1', fileName: 'file.pdf' });

    const transientError = new Error('Temporary storage write failure');
    repository.updateStatus.mockImplementation(async (_id: string, status: string) => {
      if (status === ExportStatus.COMPLETED) {
        throw transientError;
      }
      return { id: 'export-1', status };
    });

    const job = {
      data: { exportId: 'export-1' },
      attemptsMade: 0,
      opts: { attempts: 3 },
    } as Job<{ exportId: string }>;

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
    }, [ExportStatus.PROCESSING]);
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        module: 'queue',
        operation: 'export.process',
        queue: 'pdf-export',
        exportId: 'export-1',
        attemptCount: 1,
        maxAttempts: 3,
        failureType: 'retryable',
      }),
      'queue.job.failed.retryable',
    );
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        module: 'queue',
        operation: 'export.process',
        queue: 'pdf-export',
        exportId: 'export-1',
        attemptCount: 1,
        maxAttempts: 3,
        nextAttempt: 2,
      }),
      'queue.job.retry.scheduled',
    );
  });

  it('should log retry exhaustion when retryable attempts are spent', async () => {
    repository.findById.mockResolvedValue({ id: 'export-3', fileName: 'file.pdf' });

    const transientError = new Error('Redis timeout while rendering');
    repository.updateStatus.mockImplementation(async (_id: string, status: string) => {
      if (status === ExportStatus.COMPLETED) {
        throw transientError;
      }
      return { id: 'export-3', status };
    });

    const job = {
      data: { exportId: 'export-3' },
      attemptsMade: 2,
      opts: { attempts: 3 },
    } as Job<{ exportId: string }>;

    await expect(processor.process(job)).rejects.toBe(transientError);

    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        module: 'queue',
        operation: 'export.process',
        queue: 'pdf-export',
        exportId: 'export-3',
        attemptCount: 3,
        maxAttempts: 3,
      }),
      'queue.job.retry.exhausted',
    );
  });

  it('should recover after transient failure on a later attempt', async () => {
    repository.findById.mockResolvedValue({ id: 'export-4', fileName: 'file.pdf' });

    const transientError = new Error('Temporary render dependency unavailable');
    let shouldFailCompletion = true;
    repository.updateStatus.mockImplementation(async (_id: string, status: string) => {
      if (status === ExportStatus.COMPLETED && shouldFailCompletion) {
        shouldFailCompletion = false;
        throw transientError;
      }

      return { id: 'export-4', status };
    });

    const firstAttemptJob = {
      data: { exportId: 'export-4' },
      attemptsMade: 0,
      opts: { attempts: 3 },
    } as Job<{ exportId: string }>;
    const secondAttemptJob = {
      data: { exportId: 'export-4' },
      attemptsMade: 1,
      opts: { attempts: 3 },
    } as Job<{ exportId: string }>;

    await expect(processor.process(firstAttemptJob)).rejects.toBe(transientError);
    await expect(processor.process(secondAttemptJob)).resolves.toBeUndefined();

    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        exportId: 'export-4',
        attemptCount: 1,
        maxAttempts: 3,
        nextAttempt: 2,
      }),
      'queue.job.retry.scheduled',
    );
    expect(logger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        exportId: 'export-4',
        attemptCount: 2,
      }),
      'queue.job.completed',
    );
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        exportId: 'export-4',
        attemptCount: 1,
        failureType: 'retryable',
      }),
      'queue.job.failed.retryable',
    );
  });

  it('should keep failing with retryable errors until final attempt is exhausted', async () => {
    repository.findById.mockResolvedValue({ id: 'export-5', fileName: 'file.pdf' });

    const transientError = new Error('Renderer cold start timeout');
    repository.updateStatus.mockImplementation(async (_id: string, status: string) => {
      if (status === ExportStatus.COMPLETED) {
        throw transientError;
      }
      return { id: 'export-5', status };
    });

    const attempt1Job = {
      data: { exportId: 'export-5' },
      attemptsMade: 0,
      opts: { attempts: 3 },
    } as Job<{ exportId: string }>;
    const attempt2Job = {
      data: { exportId: 'export-5' },
      attemptsMade: 1,
      opts: { attempts: 3 },
    } as Job<{ exportId: string }>;
    const attempt3Job = {
      data: { exportId: 'export-5' },
      attemptsMade: 2,
      opts: { attempts: 3 },
    } as Job<{ exportId: string }>;

    await expect(processor.process(attempt1Job)).rejects.toBe(transientError);
    await expect(processor.process(attempt2Job)).rejects.toBe(transientError);
    await expect(processor.process(attempt3Job)).rejects.toBe(transientError);

    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        exportId: 'export-5',
        attemptCount: 1,
        maxAttempts: 3,
        nextAttempt: 2,
      }),
      'queue.job.retry.scheduled',
    );
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        exportId: 'export-5',
        attemptCount: 2,
        maxAttempts: 3,
        nextAttempt: 3,
      }),
      'queue.job.retry.scheduled',
    );
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        exportId: 'export-5',
        attemptCount: 3,
        maxAttempts: 3,
      }),
      'queue.job.retry.exhausted',
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
    }, [ExportStatus.PROCESSING]);
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

  it('should skip duplicate replay when export is already completed', async () => {
    repository.findById.mockResolvedValue({
      id: 'export-6',
      fileName: 'file.pdf',
      status: ExportStatus.COMPLETED,
    });

    const job = {
      data: { exportId: 'export-6' },
      attemptsMade: 1,
      opts: { attempts: 3 },
    } as Job<{ exportId: string }>;

    await expect(processor.process(job)).resolves.toBeUndefined();

    expect(repository.updateStatus).not.toHaveBeenCalled();
    expect(logger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        module: 'queue',
        operation: 'export.process',
        queue: 'pdf-export',
        exportId: 'export-6',
        attemptCount: 2,
        state: ExportStatus.COMPLETED,
      }),
      'queue.job.idempotent.skip_completed',
    );
  });

  it('should skip concurrent duplicate when export is already processing', async () => {
    repository.findById.mockResolvedValue({
      id: 'export-7',
      fileName: 'file.pdf',
      status: ExportStatus.PROCESSING,
    });

    const job = {
      data: { exportId: 'export-7' },
      attemptsMade: 0,
      opts: { attempts: 3 },
    } as Job<{ exportId: string }>;

    await expect(processor.process(job)).resolves.toBeUndefined();

    expect(repository.updateStatus).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        module: 'queue',
        operation: 'export.process',
        queue: 'pdf-export',
        exportId: 'export-7',
        attemptCount: 1,
        state: ExportStatus.PROCESSING,
      }),
      'queue.job.idempotent.skip_processing',
    );
  });

  it('should not overwrite completed export when stale duplicate attempt finishes later', async () => {
    repository.findById.mockResolvedValue({
      id: 'export-8',
      fileName: 'file.pdf',
      status: ExportStatus.PENDING,
    });

    repository.updateStatus.mockImplementation(async (_id: string, status: string) => {
      if (status === ExportStatus.PROCESSING) {
        return { id: 'export-8', status: ExportStatus.PROCESSING };
      }

      if (status === ExportStatus.COMPLETED) {
        return null;
      }

      return { id: 'export-8', status };
    });

    const job = {
      data: { exportId: 'export-8' },
      attemptsMade: 1,
      opts: { attempts: 3 },
    } as Job<{ exportId: string }>;

    await expect(processor.process(job)).resolves.toBeUndefined();

    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        module: 'queue',
        operation: 'export.process',
        queue: 'pdf-export',
        exportId: 'export-8',
        attemptCount: 2,
      }),
      'queue.job.idempotent.skip_stale_completion',
    );
    expect(logger.log).not.toHaveBeenCalledWith(
      expect.objectContaining({
        exportId: 'export-8',
      }),
      'queue.job.completed',
    );
  });

  it('should ignore stale failure transition when export state has already moved on', async () => {
    repository.findById.mockResolvedValue({ id: 'export-9', fileName: 'file.pdf' });

    const transientError = new Error('Renderer timed out');
    repository.updateStatus.mockImplementation(async (_id: string, status: string) => {
      if (status === ExportStatus.PROCESSING) {
        return { id: 'export-9', status: ExportStatus.PROCESSING };
      }

      if (status === ExportStatus.COMPLETED) {
        throw transientError;
      }

      if (status === ExportStatus.FAILED) {
        return null;
      }

      return { id: 'export-9', status };
    });

    const job = {
      data: { exportId: 'export-9' },
      attemptsMade: 0,
      opts: { attempts: 3 },
    } as Job<{ exportId: string }>;

    await expect(processor.process(job)).resolves.toBeUndefined();

    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        module: 'queue',
        operation: 'export.process',
        queue: 'pdf-export',
        exportId: 'export-9',
        attemptCount: 1,
      }),
      'queue.job.idempotent.skip_stale_failure',
    );
    expect(logger.error).not.toHaveBeenCalledWith(
      expect.objectContaining({
        exportId: 'export-9',
      }),
      'queue.job.failed.retryable',
    );
  });

  it('should preserve logical output contract on repeated completion write', async () => {
    const exportId = 'export-10';
    const fileName = 'file.pdf';
    const expectedPath = `${process.cwd()}/tmp/exports/${exportId}.pdf`;

    repository.findById
      .mockResolvedValueOnce({ id: exportId, fileName, status: ExportStatus.PENDING })
      .mockResolvedValueOnce({
        id: exportId,
        fileName,
        downloadPath: expectedPath,
        status: ExportStatus.COMPLETED,
      });

    repository.updateStatus.mockImplementation(async (_id: string, status: string) => {
      if (status === ExportStatus.PROCESSING) {
        return { id: exportId, status: ExportStatus.PROCESSING };
      }

      if (status === ExportStatus.COMPLETED) {
        return null;
      }

      return { id: exportId, status };
    });

    const job = {
      data: { exportId },
      attemptsMade: 0,
      opts: { attempts: 3 },
    } as Job<{ exportId: string }>;

    await expect(processor.process(job)).resolves.toBeUndefined();

    expect(logger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        module: 'queue',
        operation: 'export.process',
        queue: 'pdf-export',
        exportId,
        attemptCount: 1,
        filePath: expectedPath,
        fileName,
        state: ExportStatus.COMPLETED,
      }),
      'queue.job.idempotent.contract_preserved',
    );
    expect(logger.error).not.toHaveBeenCalledWith(
      expect.objectContaining({ exportId }),
      'queue.job.idempotent.contract_mismatch',
    );
  });

  it('should fail terminally when repeated completion violates output contract', async () => {
    const exportId = 'export-11';
    repository.findById
      .mockResolvedValueOnce({ id: exportId, fileName: 'file.pdf', status: ExportStatus.PENDING })
      .mockResolvedValueOnce({
        id: exportId,
        fileName: 'unexpected.pdf',
        downloadPath: '/tmp/other.pdf',
        status: ExportStatus.COMPLETED,
      });

    repository.updateStatus.mockImplementation(async (_id: string, status: string) => {
      if (status === ExportStatus.PROCESSING) {
        return { id: exportId, status: ExportStatus.PROCESSING };
      }

      if (status === ExportStatus.COMPLETED) {
        return null;
      }

      if (status === ExportStatus.FAILED) {
        return { id: exportId, status: ExportStatus.FAILED };
      }

      return { id: exportId, status };
    });

    const job = {
      data: { exportId },
      attemptsMade: 0,
      opts: { attempts: 3 },
    } as Job<{ exportId: string }>;

    await expect(processor.process(job)).rejects.toBeInstanceOf(UnrecoverableError);

    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        module: 'queue',
        operation: 'export.process',
        queue: 'pdf-export',
        exportId,
        expectedFileName: 'file.pdf',
        actualFileName: 'unexpected.pdf',
      }),
      'queue.job.idempotent.contract_mismatch',
    );
  });

  it('should treat duplicate queue delivery for the same exportId as idempotent', async () => {
    const exportId = 'export-dup-1';
    const inMemoryState = {
      id: exportId,
      fileName: 'file.pdf',
      status: ExportStatus.PENDING,
      downloadPath: undefined as string | undefined,
    };

    repository.findById.mockImplementation(async () => ({ ...inMemoryState }));
    repository.updateStatus.mockImplementation(async (_id: string, status: string, data: any) => {
      if (status === ExportStatus.PROCESSING && inMemoryState.status === ExportStatus.PENDING) {
        inMemoryState.status = ExportStatus.PROCESSING;
        return { ...inMemoryState };
      }

      if (status === ExportStatus.COMPLETED && inMemoryState.status === ExportStatus.PROCESSING) {
        inMemoryState.status = ExportStatus.COMPLETED;
        inMemoryState.downloadPath = data.downloadPath;
        return { ...inMemoryState };
      }

      return null;
    });

    const firstDelivery = {
      data: { exportId },
      attemptsMade: 0,
      opts: { attempts: 3 },
    } as Job<{ exportId: string }>;
    const duplicateDelivery = {
      data: { exportId },
      attemptsMade: 1,
      opts: { attempts: 3 },
    } as Job<{ exportId: string }>;

    await expect(processor.process(firstDelivery)).resolves.toBeUndefined();
    await expect(processor.process(duplicateDelivery)).resolves.toBeUndefined();

    expect(logger.log).toHaveBeenCalledWith(
      expect.objectContaining({ exportId }),
      'queue.job.completed',
    );
    expect(logger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        exportId,
        state: ExportStatus.COMPLETED,
      }),
      'queue.job.idempotent.skip_completed',
    );
  });

  it('should keep replayed worker execution stable after completion', async () => {
    const exportId = 'export-replay-1';
    const completedPath = `${process.cwd()}/tmp/exports/${exportId}.pdf`;

    repository.findById.mockResolvedValue({
      id: exportId,
      fileName: 'file.pdf',
      status: ExportStatus.COMPLETED,
      downloadPath: completedPath,
    });

    const replayedJob = {
      data: { exportId },
      attemptsMade: 2,
      opts: { attempts: 3 },
    } as Job<{ exportId: string }>;

    await expect(processor.process(replayedJob)).resolves.toBeUndefined();

    expect(repository.updateStatus).not.toHaveBeenCalled();
    expect(logger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        exportId,
        state: ExportStatus.COMPLETED,
      }),
      'queue.job.idempotent.skip_completed',
    );
  });
});
