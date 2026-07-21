import { CreateWorkspaceDto } from '../dto/create-workspace.dto';
import { WorkspaceEntity } from '../workspace.entity';

export interface IWorkspaceRepository {
  create(_payload: CreateWorkspaceDto): Promise<WorkspaceEntity>;
  findById(_id: string): Promise<WorkspaceEntity | null>;
}
