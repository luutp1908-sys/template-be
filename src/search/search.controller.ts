import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SearchQueryDto } from './dto/search-query.dto';
import { SearchListEntity } from './search.entity';
import { SearchService } from './search.service';

@ApiTags('search')
@ApiBearerAuth()
@Controller({ path: 'search', version: '1' })
export class SearchController {
  constructor(private readonly service: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Search templates and categories' })
  @ApiOkResponse({ type: SearchListEntity })
  search(@Query() query: SearchQueryDto): Promise<SearchListEntity> {
    return this.service.search(query);
  }
}
