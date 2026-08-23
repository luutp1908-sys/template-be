process.env.MOCK_MODE = 'true';

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Health (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/api/v1/health (GET)', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/health').expect(200);
    expect(response.headers['x-request-id']).toBeDefined();
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('/api/v1/health/metrics (GET)', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/health/metrics').expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        requestsTotal: expect.any(Number),
        requestsByStatus: expect.any(Object),
        requestLatencyMs: expect.objectContaining({
          average: expect.any(Number),
          p95: expect.any(Number),
        }),
      }),
    );
  });

  it('/api/v1/template/stats/popularity (GET)', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/template/stats/popularity?limit=5')
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body[0]).toEqual(
      expect.objectContaining({
        templateCount: expect.any(Number),
        publishedCount: expect.any(Number),
        draftCount: expect.any(Number),
      }),
    );
  });

  it('/api/v1/template/stats/by-category (GET)', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/template/stats/by-category?limit=5')
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body[0]).toEqual(
      expect.objectContaining({
        categoryId: expect.any(String),
        categoryName: expect.any(String),
        templateCount: expect.any(Number),
        publishedCount: expect.any(Number),
      }),
    );
  });

  afterEach(async () => {
    await app.close();
  });
});
