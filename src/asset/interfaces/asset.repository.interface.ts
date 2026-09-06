import { AssetEntity } from '../asset.entity';

export interface CreateAssetRecord {
  name?: string;
}

export interface IAssetRepository {
  create(_payload: CreateAssetRecord): Promise<AssetEntity>;
  findById(_id: string): Promise<AssetEntity | null>;
}
