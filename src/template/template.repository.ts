import { Injectable } from '@nestjs/common';
import { InMemoryStore } from '../common/testing/in-memory-store';
import { CreateTemplateDto } from './dto/create-template.dto';
import { TemplateEntity } from './template.entity';
import { ITemplateRepository } from './interfaces/template.repository.interface';
import { TemplateMapper } from './template.mapper';

@Injectable()
export class TemplateRepository implements ITemplateRepository {
  private readonly store = new InMemoryStore<TemplateEntity>();

  async create(payload: CreateTemplateDto): Promise<TemplateEntity> {
    return this.store.create((base) =>
      TemplateMapper.toEntity({
        ...base,
        ...payload,
      }),
    );
  }

  async findById(id: string): Promise<TemplateEntity | null> {
    return this.store.findById(id);
  }
}
