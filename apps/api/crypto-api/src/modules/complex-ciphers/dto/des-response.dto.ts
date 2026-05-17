import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CipherMetricStatDto } from '../../classical-ciphers/dto/cipher-metric-stat.dto';
import { CipherStepResponseDto } from '../../classical-ciphers/dto/cipher-step-response.dto';
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

  @ApiPropertyOptional({
    type: CipherStepResponseDto,
    isArray: true,
    description: 'Per-round byte samples and metrics (encrypt only)',
  })
  steps?: CipherStepResponseDto[];

  @ApiPropertyOptional({
    type: CipherMetricStatDto,
    isArray: true,
    description: 'Aggregated metrics across rounds (encrypt only)',
  })
  metricStats?: CipherMetricStatDto[];

  @ApiPropertyOptional({
    example: { byteEntropy: 3.1, ciphertextLength: 16 },
    description: 'Auxiliary encrypt analytics',
  })
  metadata?: Record<string, unknown>;
}
