import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParsedTextEntity } from './parsed-text.entity';
import { TextParserController } from './text-parser.controller';
import { TextParserService } from './text-parser.service';

@Module({
  imports: [TypeOrmModule.forFeature([ParsedTextEntity])],
  controllers: [TextParserController],
  providers: [TextParserService],
  exports: [TextParserService],
})
export class TextParserModule {}
