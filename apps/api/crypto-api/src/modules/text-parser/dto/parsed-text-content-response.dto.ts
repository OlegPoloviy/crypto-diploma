import { ApiProperty } from '@nestjs/swagger';
import { ParsedTextContentEncoding } from '../parsed-text.entity';

export class ParsedTextContentResponseDto {
  @ApiProperty({ example: 'sample-corpus.txt' })
  filename: string;

  @ApiProperty({ enum: ParsedTextContentEncoding })
  contentEncoding: ParsedTextContentEncoding;

  @ApiProperty({
    description:
      'UTF-8 text for natural corpora, lowercase hex string for random byte corpora',
  })
  content: string;

  @ApiProperty({
    example: 'text/plain',
    description: 'Suggested MIME type for the downloaded file',
  })
  mimeType: string;
}
