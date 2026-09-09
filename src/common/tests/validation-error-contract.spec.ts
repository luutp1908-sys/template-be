process.env.MOCK_MODE = 'true';

import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

const { AppModule } = require('../../app.module');

describe('Validation and error contract (e2e)', () => {
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

  it('returns 400 for invalid UUID params', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/category/not-a-uuid')
      .expect(400);

    expect(response.body).toEqual(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'BAD_REQUEST',
          message: expect.any(String),
        }),
      }),
    );
  });

  it('returns 400 for non-whitelisted fields', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/category')
      .send({
        name: 'Validation Category',
        slug: 'validation-category',
        editorTypeId: 0,
        unexpectedField: 'blocked',
      })
      .expect(400);

    expect(response.body).toEqual(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'BAD_REQUEST',
          message: expect.any(String),
        }),
      }),
    );
  });

  it('returns 400 for invalid enum/range values', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/search?scope=invalid&page=0')
      .expect(400);

    expect(response.body).toEqual(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'BAD_REQUEST',
          message: expect.any(String),
        }),
      }),
    );
  });

  it('returns 404 for well-formed but non-existent resource ids', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/category/stats/hierarchy/11111111-1111-1111-1111-111111111111')
      .expect(404);

    expect(response.body).toEqual(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'NOT_FOUND',
        }),
      }),
    );
  });

  it('returns 409 for domain invariant violations', async () => {
    const listResponse = await request(app.getHttpServer()).get('/api/v1/category').expect(200);
    expect(Array.isArray(listResponse.body)).toBe(true);
    expect(listResponse.body.length).toBeGreaterThan(0);

    const categoryId = listResponse.body[0].id;

    const moveResponse = await request(app.getHttpServer())
      .post(`/api/v1/category/${categoryId}/move`)
      .send({ newParentId: categoryId })
      .expect(409);

    expect(moveResponse.body).toEqual(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'CONFLICT',
          message: expect.any(String),
        }),
      }),
    );
  });

  afterEach(async () => {
    await app.close();
  });
});
