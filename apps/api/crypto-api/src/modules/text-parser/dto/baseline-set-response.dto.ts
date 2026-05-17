import { ApiProperty } from '@nestjs/swagger';
import { CreateParsedTextResponseDto } from './create-parsed-text-response.dto';

export class BaselineSetResponseDto {
  @ApiProperty({ format: 'uuid' })
  baselineSetId: string;

  @ApiProperty({ type: CreateParsedTextResponseDto })
  natural: CreateParsedTextResponseDto;

  @ApiProperty({ type: CreateParsedTextResponseDto })
  random: CreateParsedTextResponseDto;
}
