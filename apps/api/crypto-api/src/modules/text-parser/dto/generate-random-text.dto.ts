import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const MAX_RANDOM_TEXT_WORDS = 1_000_000;
export const MAX_RANDOM_TEXT_ALPHABET_LENGTH = 200;

export class GenerateRandomTextDto {
  @ApiProperty({ example: 'Monkey text 10k', maxLength: 150 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title: string;

  @ApiProperty({
    example: 10000,
    minimum: 1,
    maximum: MAX_RANDOM_TEXT_WORDS,
    description: 'Number of random words to generate',
  })
  @IsInt()
  @Min(1)
  @Max(MAX_RANDOM_TEXT_WORDS)
  wordCount: number;

  @ApiProperty({
    example: 'abcdefghijklmnopqrstuvwxyz',
    required: false,
    maxLength: MAX_RANDOM_TEXT_ALPHABET_LENGTH,
    description: 'Characters used to build monkey-text words',
  })
  @IsString()
  @IsOptional()
  @MaxLength(MAX_RANDOM_TEXT_ALPHABET_LENGTH)
  alphabet?: string;

  @ApiProperty({ example: 3, minimum: 1, maximum: 64, required: false })
  @IsInt()
  @Min(1)
  @Max(64)
  @IsOptional()
  minWordLength?: number;

  @ApiProperty({ example: 10, minimum: 1, maximum: 64, required: false })
  @IsInt()
  @Min(1)
  @Max(64)
  @IsOptional()
  maxWordLength?: number;

  @ApiProperty({
    required: false,
    description: 'Optional seed for reproducible pseudo-random text',
  })
  @IsInt()
  @IsOptional()
  seed?: number;
}
