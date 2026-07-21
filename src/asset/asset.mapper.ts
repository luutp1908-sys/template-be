import { AssetEntity } from './asset.entity';

export class AssetMapper {
  static toEntity(partial: Partial<AssetEntity>): AssetEntity {
    return {
      id: partial.id ?? '',
      createdAt: partial.createdAt ?? new Date(),
      updatedAt: partial.updatedAt ?? new Date(),
    };
  }
}
