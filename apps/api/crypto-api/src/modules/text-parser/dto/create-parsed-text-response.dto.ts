import { ApiProperty } from '@nestjs/swagger';
import { ParsedTextSource, ParsedTextStatus } from '../parsed-text.entity';

export class CreateParsedTextResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Moby Dick' })
  title: string;

  @ApiProperty({ enum: ParsedTextSource, example: ParsedTextSource.UPLOAD })
  source: ParsedTextSource;

  @ApiProperty({
    enum: ParsedTextStatus,
    example: ParsedTextStatus.QUEUED,
  })
  status: ParsedTextStatus;

  @ApiProperty({ example: 0 })
  totalWords: number;

  @ApiProperty({ example: 0 })
  totalChars: number;

  @ApiProperty({ example: 0 })
  uniqueWords: number;

  @ApiProperty({ example: 0.71, required: false, nullable: true })
  hurstExponent?: number | null;

  @ApiProperty({ example: 0.68, required: false, nullable: true })
  dfaAlpha?: number | null;

  @ApiProperty({ example: 4.2, required: false, nullable: true })
  wordFrequencyEntropy?: number | null;

  @ApiProperty({ example: 'book.txt', required: false })
  originalFileName?: string;

  @ApiProperty({ required: false })
  errorMessage?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
