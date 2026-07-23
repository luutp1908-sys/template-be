import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { CreateUserDraftDto } from './dto/create-user-draft.dto';
import { UpdateUserDraftDto } from './dto/update-user-draft.dto';
import { UserDraftListQueryDto } from './dto/user-draft-list-query.dto';
import { UserDraftEntity, UserDraftListEntity } from './user-draft.entity';
import { UserDraftRepository } from './user-draft.repository';

@Injectable()
export class UserDraftService {
  constructor(@Inject('USER_DRAFT_REPOSITORY') private readonly repository: any) {}

  async create(payload: CreateUserDraftDto, userId: string): Promise<UserDraftEntity> {
    return this.repository.create(payload, userId);
  }

  async findById(id: string, userId: string): Promise<UserDraftEntity> {
    const userDraft = await this.repository.findById(id, userId);
    if (!userDraft) {
      throw new NotFoundException('User draft not found');
    }

    return userDraft;
  }

  async findMany(query: UserDraftListQueryDto, userId: string): Promise<UserDraftListEntity> {
    return this.repository.findMany(query, userId);
  }

  async update(id: string, payload: UpdateUserDraftDto, userId: string): Promise<UserDraftEntity> {
    const userDraft = await this.repository.update(id, payload, userId);
    if (!userDraft) {
      throw new NotFoundException('User draft not found');
    }

    return userDraft;
  }

  async touch(id: string, userId: string): Promise<UserDraftEntity> {
    const userDraft = await this.repository.touch(id, userId);
    if (!userDraft) {
      throw new NotFoundException('User draft not found');
    }

    return userDraft;
  }

  async remove(id: string, userId: string): Promise<void> {
    const removed = await this.repository.remove(id, userId);
    if (!removed) {
      throw new NotFoundException('User draft not found');
    }
  }
}