import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CipherMetricStatDto } from '../../classical-ciphers/dto/cipher-metric-stat.dto';
import { CipherStepResponseDto } from '../../classical-ciphers/dto/cipher-step-response.dto';
import {
  AesMode,
  BinaryEncoding,
  KalynaOperation,
} from '../complex-ciphers.types';

export class KalynaResponseDto {
  @ApiProperty({ enum: KalynaOperation, example: KalynaOperation.ENCRYPT })
  operation: KalynaOperation;

  @ApiProperty({ enum: AesMode, example: AesMode.CBC })
  mode: AesMode;

  @ApiProperty({ example: 128 })
  blockSizeBits: number;

  @ApiProperty({ example: 128 })
  keySize: number;

  @ApiProperty({ enum: BinaryEncoding, example: BinaryEncoding.HEX })
  outputEncoding: BinaryEncoding;

  @ApiProperty({ example: '81bf1c7d779bac20e1c9ea39b4d2ad06' })
  result: string;

  @ApiPropertyOptional({ example: '101112131415161718191a1b1c1d1e1f' })
  iv?: string;

  @ApiPropertyOptional({ type: CipherStepResponseDto, isArray: true })
  steps?: CipherStepResponseDto[];

  @ApiPropertyOptional({ type: CipherMetricStatDto, isArray: true })
  metricStats?: CipherMetricStatDto[];

  @ApiPropertyOptional()
  metadata?: Record<string, unknown>;
}
