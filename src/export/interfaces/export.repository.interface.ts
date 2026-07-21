import { CreateExportDto } from '../dto/create-export.dto';
import { ExportEntity } from '../export.entity';

export interface IExportRepository {
  create(_payload: CreateExportDto): Promise<ExportEntity>;
  findById(_id: string): Promise<ExportEntity | null>;
}
