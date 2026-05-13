import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AesMode,
  BinaryEncoding,
  DesOperation,
} from '../complex-ciphers.types';

export class DesResponseDto {
  @ApiProperty({ enum: DesOperation, example: DesOperation.ENCRYPT })
  operation: DesOperation;

  @ApiProperty({ enum: AesMode, example: AesMode.CBC })
  mode: AesMode;

  @ApiProperty({ example: 64 })
  keySize: number;

  @ApiProperty({ enum: BinaryEncoding, example: BinaryEncoding.HEX })
  outputEncoding: BinaryEncoding;

  @ApiProperty({
    example: '85e813540f0ab405',
    description: 'Encoded encryption or decryption result',
  })
  result: string;

  @ApiPropertyOptional({
    example: '1234567890abcdef',
    description: 'CBC initialization vector encoded as hex',
  })
  iv?: string;
}
