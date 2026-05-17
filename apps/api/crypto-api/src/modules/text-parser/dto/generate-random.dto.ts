import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const MAX_RANDOM_BYTE_LENGTH = 10 * 1024 * 1024;

export class GenerateRandomBytesDto {
  @ApiProperty({ example: 'Random baseline 1 MiB', maxLength: 150 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title: string;

  @ApiProperty({
    example: 65536,
    minimum: 1,
    maximum: MAX_RANDOM_BYTE_LENGTH,
    description: 'Number of cryptographically random bytes to generate',
  })
  @IsInt()
  @Min(1)
  @Max(MAX_RANDOM_BYTE_LENGTH)
  byteLength: number;

  @ApiProperty({
    format: 'uuid',
    required: false,
    description: 'Optional baseline set id to link with a natural corpus',
  })
  @IsUUID('4')
  @IsOptional()
  baselineSetId?: string;

  @ApiProperty({
    required: false,
    description:
      'Optional seed for reproducible pseudo-random bytes (not cryptographically secure)',
  })
  @IsInt()
  @IsOptional()
  seed?: number;
}
