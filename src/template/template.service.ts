import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { CreateTemplateDto } from './dto/create-template.dto';
import { TemplateListQueryDto } from './dto/template-list-query.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { TemplateEntity, TemplateListEntity } from './template.entity';
import { TemplateRepository } from './template.data.repository';

@Injectable()
export class TemplateService {
  constructor(@Inject('TEMPLATE_REPOSITORY') private readonly repository: any) {}

  async create(payload: CreateTemplateDto, authorId: string): Promise<TemplateEntity> {
    return this.repository.create(payload, authorId);
  }

  async findById(id: string): Promise<TemplateEntity> {
    const template = await this.repository.findById(id);
    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return template;
  }

  async findMany(query: TemplateListQueryDto): Promise<TemplateListEntity> {
    return this.repository.findMany(query);
  }

  async update(id: string, payload: UpdateTemplateDto): Promise<TemplateEntity> {
    const template = await this.repository.update(id, payload);
    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return template;
  }

  async publish(id: string): Promise<TemplateEntity> {
    const template = await this.repository.publish(id);
    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return template;
  }

  async archive(id: string): Promise<TemplateEntity> {
    const template = await this.repository.archive(id);
    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return template;
  }

  async remove(id: string): Promise<void> {
    const removed = await this.repository.remove(id);
    if (!removed) {
      throw new NotFoundException('Template not found');
    }
  }
}
