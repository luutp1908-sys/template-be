import { Injectable } from '@nestjs/common';
import { CreateTagDto } from './dto/create-tag.dto';
import { TagEntity } from './tag.entity';
import { TagRepository } from './tag.repository';

@Injectable()
export class TagService {
  constructor(private readonly repository: TagRepository) {}

  async create(payload: CreateTagDto): Promise<TagEntity> {
    return this.repository.create(payload);
  }

  async findById(id: string): Promise<TagEntity | null> {
    return this.repository.findById(id);
  }
}
