import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class VigenereCipherDto {
  @ApiProperty({
    example: 'hello world',
    description: 'Plain text encrypted with a Vigenere key',
  })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiProperty({
    example: 'VERYLONGRESEARCHKEY',
    description: 'Alphabetic Vigenere key. Longer keys are supported',
  })
  @IsString()
  @IsNotEmpty()
  key: string;
}

export class VigenereKeyLengthsDto extends VigenereCipherDto {
  @ApiProperty({
    example: [1, 3, 5, 10, 20, 100, 1000],
    required: false,
    description:
      'Key lengths to compare. The provided key is repeated or truncated to each length',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(10000, { each: true })
  @IsOptional()
  keyLengths?: number[];
}
