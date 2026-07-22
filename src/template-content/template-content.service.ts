import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateTemplateContentDto } from './dto/create-template-content.dto';
import { UpdateTemplateContentDto } from './dto/update-template-content.dto';
import { TemplateContentEntity } from './template-content.entity';
import { TemplateContentRepository } from './template-content.repository';

@Injectable()
export class TemplateContentService {
  constructor(private readonly repository: TemplateContentRepository) {}

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
}