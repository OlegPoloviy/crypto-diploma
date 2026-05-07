import { ApiProperty } from '@nestjs/swagger';

export class ParsedTextResponseDto {
  @ApiProperty({
    example: ['the', 'quick', 'brown'],
    description: 'Prepared words in their original order',
    isArray: true,
    type: String,
  })
  words: string[];

  @ApiProperty({
    example: 85000,
    description: 'Total number of parsed words',
  })
  totalWords: number;

  @ApiProperty({
    example: 450000,
    description:
      'Total number of letters across parsed words, excluding spaces',
  })
  totalChars: number;

  @ApiProperty({
    example: 12000,
    description: 'Number of distinct words',
  })
  uniqueWords: number;
}
