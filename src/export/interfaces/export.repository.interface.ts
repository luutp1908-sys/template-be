import { ExportEntity } from '../export.entity';

export interface ExportContentRecord {
  pages: unknown[];
  meta?: Record<string, unknown>;
}

export interface CreateExportRecord {
  format: ExportEntity['format'];
  content: ExportEntity['content'];
  draftId?: string;
  templateId?: string;
  workspaceId?: string;
  templateName?: string;
}

export interface IExportRepository {
  create(_payload: CreateExportRecord, _userId: string): Promise<ExportEntity>;
  findById(_id: string, _userId?: string): Promise<ExportEntity | null>;
  updateStatus(
    _id: string,
    _status: string,
    _data?: Partial<ExportEntity>,
    _expectedCurrentStatuses?: string[],
  ): Promise<ExportEntity | null>;
}
