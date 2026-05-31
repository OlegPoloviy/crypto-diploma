import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { TextPreprocessMode } from '../text-parser.util';

export class ShuffleTextDto {
  @ApiProperty({ example: 'Moby Dick shuffled', maxLength: 150 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title: string;

  @ApiProperty({
    example: 'The quick brown fox jumps over the lazy dog.',
    description: 'Raw text to preprocess, split into words, and shuffle',
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
    description: 'Optional seed for reproducible word shuffling',
  })
  @IsInt()
  @IsOptional()
  seed?: number;
}
