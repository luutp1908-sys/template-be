import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CreateAssetDto } from './dto/create-asset.dto';
import { AssetEntity } from './asset.entity';
import { AssetService } from './asset.service';

@ApiTags('asset')
@ApiBearerAuth()
@Controller({ path: 'asset', version: '1' })
export class AssetController {
  constructor(private readonly service: AssetService) {}

  @Post()
  create(@Body() payload: CreateAssetDto): Promise<AssetEntity> {
    return this.service.create(payload);
  }

  @Get(':id')
  findById(@Param('id') id: string): Promise<AssetEntity | null> {
    return this.service.findById(id);
  }
}
