import { Module } from '@nestjs/common';
import { EditorTypeController } from './editor-type.controller';
import { EditorTypeService } from './editor-type.service';
import { EditorTypeRepository } from './editor-type.repository';

@Module({
  controllers: [EditorTypeController],
  providers: [EditorTypeService, EditorTypeRepository],
  exports: [EditorTypeService],
})
export class EditorTypeModule {}
