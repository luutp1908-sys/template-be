process.env.MOCK_MODE = 'true';

import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

const { AppModule } = require('../../app.module');

describe('Template stats (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  it('/api/v1/template/stats/popularity (GET)', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/template/stats/popularity?limit=5')
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
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
    expect(response.body.length).toBeGreaterThan(0);
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
