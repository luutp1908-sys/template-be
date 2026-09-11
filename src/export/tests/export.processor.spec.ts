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
    });
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
});
