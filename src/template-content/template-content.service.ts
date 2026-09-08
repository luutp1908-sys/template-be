import { Injectable, NotFoundException, Inject, Logger } from '@nestjs/common';
import { CreateTemplateContentDto } from './dto/create-template-content.dto';
import { UpdateTemplateContentDto } from './dto/update-template-content.dto';
import { TemplateContentEntity } from './template-content.entity';
import { TemplateContentRepository } from './template-content.repository';
import { UserDraftService } from '../user-draft/user-draft.service';
import { UserDraftEntity } from '../user-draft/user-draft.entity';

@Injectable()
export class TemplateContentService {
  private readonly logger = new Logger(TemplateContentService.name);

  constructor(
    @Inject('TEMPLATE_CONTENT_REPOSITORY') private readonly repository: any,
    private readonly userDraftService: UserDraftService,
  ) {}

  async upsert(templateId: string, payload: CreateTemplateContentDto): Promise<TemplateContentEntity> {
    return this.repository.upsert(templateId, payload);
  }

  async findByTemplateId(templateId: string): Promise<TemplateContentEntity> {
    const templateContent = await this.repository.findByTemplateId(templateId);
    if (!templateContent) {
      throw new NotFoundException('Template content not found');
    }

    return templateContent;
  }

  async update(
    templateId: string,
    payload: UpdateTemplateContentDto,
  ): Promise<TemplateContentEntity> {
    const templateContent = await this.repository.update(templateId, payload);
    if (!templateContent) {
      throw new NotFoundException('Template content not found');
    }

    return templateContent;
  }

  async remove(templateId: string): Promise<void> {
    const removed = await this.repository.remove(templateId);
    if (!removed) {
      throw new NotFoundException('Template content not found');
    }
  }

  async findFromDraft(draftId: string, userId: string): Promise<{ templateContent: TemplateContentEntity | null; draft: UserDraftEntity }> {
    const draft = await this.userDraftService.findById(draftId, userId);
    // load canonical template content (may throw if not found)
    let templateContent: TemplateContentEntity | null = null;
    try {
      templateContent = await this.repository.findByTemplateId(draft.templateId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        return { templateContent: null, draft };
      }

      this.logger.error(
        `TEMPLATE_CONTENT_LOAD_FAILED draftId=${draftId} templateId=${draft.templateId} userId=${userId} reason=${(error as Error).message}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }

    return { templateContent, draft };
  }
}