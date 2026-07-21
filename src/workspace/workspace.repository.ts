import { Injectable } from '@nestjs/common';
import { InMemoryStore } from '../common/testing/in-memory-store';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { WorkspaceEntity } from './workspace.entity';
import { IWorkspaceRepository } from './interfaces/workspace.repository.interface';
import { WorkspaceMapper } from './workspace.mapper';

@Injectable()
export class WorkspaceRepository implements IWorkspaceRepository {
  private readonly store = new InMemoryStore<WorkspaceEntity>();

  async create(payload: CreateWorkspaceDto): Promise<WorkspaceEntity> {
    return this.store.create((base) =>
      WorkspaceMapper.toEntity({
        ...base,
        ...payload,
      }),
    );
  }

  async findById(id: string): Promise<WorkspaceEntity | null> {
    return this.store.findById(id);
  }
}
