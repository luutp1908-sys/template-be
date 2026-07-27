import { Module } from '@nestjs/common';
import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';

const impl = require('./category.repository');
const CATEGORY_REPOSITORY = 'CATEGORY_REPOSITORY';

@Module({
  controllers: [CategoryController],
  providers: [
    CategoryService,
    { provide: CATEGORY_REPOSITORY, useClass: impl.CategoryRepository },
  ],
  exports: [CategoryService],
})
export class CategoryModule {}
