import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { WorkspaceEntity } from './workspace.entity';
import { WorkspaceRepository } from './workspace.repository';

@Injectable()
export class WorkspaceService {
  constructor(private readonly repository: WorkspaceRepository) {}

  async create(payload: CreateWorkspaceDto, createdByUserId?: string): Promise<WorkspaceEntity> {
    return this.repository.create(payload, createdByUserId);
  }

  async findMany(): Promise<WorkspaceEntity[]> {
    return this.repository.findMany();
  }

  async findById(id: string): Promise<WorkspaceEntity | null> {
    return this.repository.findById(id);
  }

  async update(id: string, payload: UpdateWorkspaceDto): Promise<WorkspaceEntity> {
    const updated = await this.repository.update(id, payload);
    if (!updated) {
      throw new NotFoundException(`Workspace ${id} not found`);
    }
    return updated;
  }

  async remove(id: string): Promise<WorkspaceEntity> {
    const removed = await this.repository.remove(id);
    if (!removed) {
      throw new NotFoundException(`Workspace ${id} not found`);
    }
    return removed;
  }
}
