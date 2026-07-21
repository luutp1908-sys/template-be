import { Injectable } from '@nestjs/common';
import { InMemoryStore } from '../common/testing/in-memory-store';
import { CreateAssetDto } from './dto/create-asset.dto';
import { AssetEntity } from './asset.entity';
import { IAssetRepository } from './interfaces/asset.repository.interface';
import { AssetMapper } from './asset.mapper';

@Injectable()
export class AssetRepository implements IAssetRepository {
  private readonly store = new InMemoryStore<AssetEntity>();

  async create(payload: CreateAssetDto): Promise<AssetEntity> {
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
