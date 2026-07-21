import { Injectable } from '@nestjs/common';
import { CreateTemplateDto } from './dto/create-template.dto';
import { TemplateEntity } from './template.entity';
import { TemplateRepository } from './template.repository';

@Injectable()
export class TemplateService {
  constructor(private readonly repository: TemplateRepository) {}

  async create(payload: CreateTemplateDto): Promise<TemplateEntity> {
    return this.repository.create(payload);
  }

  async findById(id: string): Promise<TemplateEntity | null> {
    return this.repository.findById(id);
  }
}
