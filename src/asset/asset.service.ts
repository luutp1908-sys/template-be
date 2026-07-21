import { Injectable } from '@nestjs/common';
import { CreateAssetDto } from './dto/create-asset.dto';
import { AssetEntity } from './asset.entity';
import { AssetRepository } from './asset.repository';

@Injectable()
export class AssetService {
  constructor(private readonly repository: AssetRepository) {}

  async create(payload: CreateAssetDto): Promise<AssetEntity> {
    return this.repository.create(payload);
  }

  async findById(id: string): Promise<AssetEntity | null> {
    return this.repository.findById(id);
  }
}
