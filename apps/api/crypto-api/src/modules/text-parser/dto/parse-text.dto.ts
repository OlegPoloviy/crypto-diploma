import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { TextPreprocessMode } from '../text-parser.util';

export class ParseTextDto {
  @ApiProperty({
    example: 'Moby Dick',
    maxLength: 150,
    description: 'Human-readable title for the parsed text',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title: string;

  @ApiProperty({
    example:
      '*** START OF THE PROJECT GUTENBERG EBOOK SAMPLE ***\nThe quick, brown fox.\n*** END OF THE PROJECT GUTENBERG EBOOK SAMPLE ***',
    description:
      'Raw book text, including optional Project Gutenberg header/footer',
  })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiProperty({
    example: 'pg2701.txt',
    required: false,
    description: 'Optional source filename when text is pasted manually',
  })
  @IsString()
  @IsOptional()
  originalFileName?: string;

  @ApiProperty({
    enum: TextPreprocessMode,
    default: TextPreprocessMode.AUTO,
    required: false,
    description:
      'Text cleanup before metrics: auto detects Gutenberg markers, none keeps raw text',
  })
  @IsEnum(TextPreprocessMode)
  @IsOptional()
  preprocess?: TextPreprocessMode;
}
