import { Injectable } from '@nestjs/common';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { WorkspaceEntity } from './workspace.entity';
import { WorkspaceRepository } from './workspace.repository';

@Injectable()
export class WorkspaceService {
  constructor(private readonly repository: WorkspaceRepository) {}

  async create(payload: CreateWorkspaceDto): Promise<WorkspaceEntity> {
    return this.repository.create(payload);
  }

  async findById(id: string): Promise<WorkspaceEntity | null> {
    return this.repository.findById(id);
  }
}
