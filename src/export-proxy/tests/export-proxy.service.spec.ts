import { HttpException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExportFormat } from '../../export/dto/create-export.dto';
import { ExportProxyService } from '../export-proxy.service';

describe('ExportProxyService', () => {
  let service: ExportProxyService;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    const configService = {
      get: jest.fn().mockReturnValue('http://localhost:4100'),
    } as unknown as ConfigService;

    service = new ExportProxyService(configService);
    fetchMock = jest.fn();
    (global as any).fetch = fetchMock;
  });

  afterEach(() => {
    delete (global as any).fetch;
  });

  it('unwraps upstream success envelope for createJob', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            id: 'exp-1',
            requestedByUserId: 'user-1',
            format: 'pdf',
            status: 'pending',
            fileName: 'template.pdf',
            content: { pages: [] },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      ),
    );

    const result = await service.createJob(
      {
        format: ExportFormat.PDF,
        content: { pages: [] },
      },
      'Bearer access-token',
    );

    expect(result.id).toBe('exp-1');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://localhost:4100/api/v1/export/jobs');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer access-token');
    expect((init.headers as Record<string, string>)['content-type']).toBe('application/json');
  });

  it('propagates upstream status and message on failure', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ message: 'Export job is not completed yet' }), {
        status: 409,
        headers: { 'content-type': 'application/json' },
      }),
    );

    await expect(
      service.findJobStatus('exp-1', 'Bearer access-token'),
    ).rejects.toMatchObject({
      status: 409,
      message: 'Export job is not completed yet',
    });
  });

  it('returns binary payload and headers for download', async () => {
    fetchMock.mockResolvedValue(
      new Response(Buffer.from('pdf-binary-data'), {
        status: 200,
        headers: {
          'content-type': 'application/pdf',
          'content-disposition': 'attachment; filename="template.pdf"',
        },
      }),
    );

    const result = await service.download('exp-1', 'Bearer access-token');
    expect(result.contentType).toBe('application/pdf');
    expect(result.contentDisposition).toBe('attachment; filename="template.pdf"');
    expect(result.body.toString('utf8')).toBe('pdf-binary-data');
  });

  it('fails fast when EXPORT_SERVICE_URL is not configured', async () => {
    const configService = {
      get: jest.fn().mockReturnValue(''),
    } as unknown as ConfigService;
    const noConfigService = new ExportProxyService(configService);

    await expect(
      noConfigService.findJobStatus('exp-1', 'Bearer access-token'),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});
