import { CreateAssetDto } from '../dto/create-asset.dto';
import { AssetEntity } from '../asset.entity';

export interface IAssetRepository {
  create(_payload: CreateAssetDto): Promise<AssetEntity>;
  findById(_id: string): Promise<AssetEntity | null>;
}
