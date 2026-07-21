import { Test, TestingModule } from '@nestjs/testing';
import { EditorTypeService } from '../editor-type.service';
import { EditorTypeRepository } from '../editor-type.repository';

describe('EditorTypeService', () => {
  let service: EditorTypeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EditorTypeService,
        {
          provide: EditorTypeRepository,
          useValue: {
            create: jest.fn(),
            findById: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EditorTypeService>(EditorTypeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
