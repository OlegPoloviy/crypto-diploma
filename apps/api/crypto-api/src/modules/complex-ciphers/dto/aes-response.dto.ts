import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AesMode,
  AesOperation,
  BinaryEncoding,
} from '../complex-ciphers.types';

export class AesResponseDto {
  @ApiProperty({ enum: AesOperation, example: AesOperation.ENCRYPT })
  operation: AesOperation;

  @ApiProperty({ enum: AesMode, example: AesMode.CBC })
  mode: AesMode;

  @ApiProperty({ example: 128 })
  keySize: number;

  @ApiProperty({ enum: BinaryEncoding, example: BinaryEncoding.HEX })
  outputEncoding: BinaryEncoding;

  @ApiProperty({
    example: '7649abac8119b246cee98e9b12e9197d',
    description: 'Encoded encryption or decryption result',
  })
  result: string;

  @ApiPropertyOptional({
    example: '101112131415161718191a1b1c1d1e1f',
    description: 'CBC initialization vector encoded as hex',
  })
  iv?: string;
}
