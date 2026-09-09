import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { WorkspaceService } from '../../workspace/workspace.service';
import { TemplateService } from '../../template/template.service';
import { ExportService } from '../export.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ExportFormat } from '../dto/create-export.dto';
import { ExportStatus } from '../export.entity';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

describe('ExportService', () => {
  let service: ExportService;
  let repository: { create: jest.Mock; findById: jest.Mock };
  let queue: { add: jest.Mock };
  let workspaceService: { findById: jest.Mock };
  let templateService: { findById: jest.Mock };

  beforeEach(async () => {
    repository = {
      create: jest.fn(),
      findById: jest.fn(),
    };
    queue = { add: jest.fn() };
    workspaceService = { findById: jest.fn() };
    templateService = { findById: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExportService,
        {
          provide: 'EXPORT_REPOSITORY',
          useValue: repository,
        },
        {
          provide: getQueueToken('pdf-export'),
          useValue: queue,
        },
        { provide: WorkspaceService, useValue: workspaceService },
        { provide: TemplateService, useValue: templateService },
      ],
    }).compile();

    service = module.get<ExportService>(ExportService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should reject missing workspace with not-found semantics', async () => {
    workspaceService.findById.mockResolvedValue(null);

    await expect(
      service.createJob(
        {
          format: ExportFormat.PDF,
          content: { pages: [] },
          workspaceId: 'invalid-workspace',
        } as any,
        'user-1',
      ),
    ).rejects.toThrow(NotFoundException);

    expect(repository.create).not.toHaveBeenCalled();
  });

  it('should propagate missing template as not-found', async () => {
    workspaceService.findById.mockResolvedValue({ id: 'workspace-1' } as any);
    templateService.findById.mockRejectedValue(new NotFoundException('Template not found'));

    await expect(
      service.createJob(
        {
          format: ExportFormat.PDF,
          content: { pages: [] },
          workspaceId: 'workspace-1',
          templateId: 'template-1',
        } as any,
        'user-1',
      ),
    ).rejects.toThrow(NotFoundException);

    expect(repository.create).not.toHaveBeenCalled();
  });

  it('should throw not-found when status job does not exist', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.findJobStatusOrThrow('job-1', 'user-1')).rejects.toThrow(NotFoundException);
  });

  it('should return job when status job exists', async () => {
    const job = { id: 'job-1', status: ExportStatus.PENDING } as any;
    repository.findById.mockResolvedValue(job);

    await expect(service.findJobStatusOrThrow('job-1', 'user-1')).resolves.toEqual(job);
  });

  it('should throw conflict when download job is not completed', async () => {
    repository.findById.mockResolvedValue({
      id: 'job-1',
      status: ExportStatus.PROCESSING,
      downloadPath: null,
    });

    await expect(service.resolveDownloadableJobOrThrow('job-1', 'user-1')).rejects.toThrow(
      ConflictException,
    );
  });

  it('should throw conflict when completed job file does not exist', async () => {
    repository.findById.mockResolvedValue({
      id: 'job-1',
      status: ExportStatus.COMPLETED,
      downloadPath: '/tmp/missing.pdf',
    });

    await expect(service.resolveDownloadableJobOrThrow('job-1', 'user-1')).rejects.toThrow(
      ConflictException,
    );
  });

  it('should return completed job when download file exists', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'export-service-test-'));
    const existingPath = join(tempDir, 'file.pdf');
    writeFileSync(existingPath, 'ok');

    const job = {
      id: 'job-1',
      status: ExportStatus.COMPLETED,
      downloadPath: existingPath,
    } as any;
    repository.findById.mockResolvedValue(job);

    try {
      await expect(service.resolveDownloadableJobOrThrow('job-1', 'user-1')).resolves.toEqual(job);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
