import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { ExportProxyController } from '../export-proxy.controller';
import { ExportProxyService } from '../export-proxy.service';

describe('ExportProxyController', () => {
  let controller: ExportProxyController;
  let service: {
    createJob: jest.Mock;
    findJobStatus: jest.Mock;
    download: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      createJob: jest.fn(),
      findJobStatus: jest.fn(),
      download: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExportProxyController],
      providers: [{ provide: ExportProxyService, useValue: service }],
    }).compile();

    controller = module.get<ExportProxyController>(ExportProxyController);
  });

  it('forwards auth header for createJob', async () => {
    const payload = { format: 'pdf', content: { pages: [] } } as any;
    service.createJob.mockResolvedValue({ id: 'exp-1' });

    const result = await controller.createJob(payload, {
      headers: { authorization: 'Bearer token' },
    } as any);

    expect(service.createJob).toHaveBeenCalledWith(payload, 'Bearer token');
    expect(result).toEqual({ id: 'exp-1' });
  });

  it('writes download headers and body from proxy service', async () => {
    service.download.mockResolvedValue({
      body: Buffer.from('file'),
      contentType: 'application/pdf',
      contentDisposition: 'attachment; filename="a.pdf"',
    });

    const res = {
      setHeader: jest.fn(),
      send: jest.fn(),
    } as unknown as Response;

    await controller.download('exp-1', { headers: { authorization: 'Bearer t' } } as any, res);

    expect(service.download).toHaveBeenCalledWith('exp-1', 'Bearer t');
    expect((res.setHeader as jest.Mock).mock.calls).toEqual([
      ['Content-Type', 'application/pdf'],
      ['Content-Disposition', 'attachment; filename="a.pdf"'],
    ]);
    expect(res.send).toHaveBeenCalledWith(Buffer.from('file'));
  });
});
