import { CreateWorkspaceDto } from '../dto/create-workspace.dto';
import { UpdateWorkspaceDto } from '../dto/update-workspace.dto';
import { WorkspaceEntity } from '../workspace.entity';

export interface IWorkspaceRepository {
  create(_payload: CreateWorkspaceDto, _createdByUserId?: string): Promise<WorkspaceEntity>;
  findMany(): Promise<WorkspaceEntity[]>;
  findById(_id: string): Promise<WorkspaceEntity | null>;
  update(_id: string, _payload: UpdateWorkspaceDto): Promise<WorkspaceEntity | null>;
  remove(_id: string): Promise<WorkspaceEntity | null>;
}
