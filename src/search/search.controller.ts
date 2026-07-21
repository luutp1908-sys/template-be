import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CreateSearchDto } from './dto/create-search.dto';
import { SearchEntity } from './search.entity';
import { SearchService } from './search.service';

@ApiTags('search')
@ApiBearerAuth()
@Controller({ path: 'search', version: '1' })
export class SearchController {
  constructor(private readonly service: SearchService) {}

  @Post()
  create(@Body() payload: CreateSearchDto): Promise<SearchEntity> {
    return this.service.create(payload);
  }

  @Get(':id')
  findById(@Param('id') id: string): Promise<SearchEntity | null> {
    return this.service.findById(id);
  }
}
