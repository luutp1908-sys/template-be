import { Injectable } from '@nestjs/common';
import { InMemoryStore } from '../common/testing/in-memory-store';
import { AssetEntity } from './asset.entity';
import { CreateAssetRecord, IAssetRepository } from './interfaces/asset.repository.interface';
import { AssetMapper } from './asset.mapper';

@Injectable()
export class AssetRepository implements IAssetRepository {
  private readonly store = new InMemoryStore<AssetEntity>();

  async create(payload: CreateAssetRecord): Promise<AssetEntity> {
    return this.store.create((base) =>
      AssetMapper.toEntity({
        ...base,
        ...payload,
      }),
    );
  }

  async findById(id: string): Promise<AssetEntity | null> {
    return this.store.findById(id);
  }
}
