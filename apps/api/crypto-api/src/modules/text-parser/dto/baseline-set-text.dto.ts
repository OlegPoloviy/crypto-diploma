import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { TextPreprocessMode } from '../text-parser.util';
import { MAX_RANDOM_BYTE_LENGTH } from './generate-random.dto';

export class BaselineSetTextDto {
  @ApiProperty({ example: 'War and Peace baseline', maxLength: 150 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title: string;

  @ApiProperty({
    description: 'Natural language plain text (no encryption)',
  })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiProperty({
    enum: TextPreprocessMode,
    default: TextPreprocessMode.AUTO,
    required: false,
  })
  @IsEnum(TextPreprocessMode)
  @IsOptional()
  preprocess?: TextPreprocessMode;

  @ApiProperty({
    required: false,
    description:
      'Random byte length; defaults to UTF-8 byte length of preprocessed text',
    minimum: 1,
    maximum: MAX_RANDOM_BYTE_LENGTH,
  })
  @IsInt()
  @Min(1)
  @Max(MAX_RANDOM_BYTE_LENGTH)
  @IsOptional()
  randomByteLength?: number;

  @ApiProperty({
    required: false,
    description: 'Optional seed for reproducible random baseline bytes',
  })
  @IsInt()
  @IsOptional()
  seed?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  originalFileName?: string;
}
