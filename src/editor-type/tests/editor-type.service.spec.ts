import { Test, TestingModule } from '@nestjs/testing';
import { EditorTypeService } from '../editor-type.service';
import { EditorTypeRepository } from '../editor-type.repository';

describe('EditorTypeService', () => {
  let service: EditorTypeService;
  const repository = {
    create: jest.fn(),
    findById: jest.fn(),
    ensureByKey: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EditorTypeService,
        {
          provide: EditorTypeRepository,
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get<EditorTypeService>(EditorTypeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should resolve db editor type id for supported numeric id', async () => {
    repository.ensureByKey.mockResolvedValue('db-editor-type-id');

    await expect(service.ensureEditorTypeByNumericId(0)).resolves.toBe('db-editor-type-id');
    expect(repository.ensureByKey).toHaveBeenCalledWith('graphic', 'Graphic', undefined);
  });

  it('should throw invariant error for unsupported numeric id', async () => {
    await expect(service.ensureEditorTypeByNumericId(999)).rejects.toThrow(
      'Invariant violation: unsupported editorTypeId=999',
    );
    expect(repository.ensureByKey).not.toHaveBeenCalled();
  });
});
