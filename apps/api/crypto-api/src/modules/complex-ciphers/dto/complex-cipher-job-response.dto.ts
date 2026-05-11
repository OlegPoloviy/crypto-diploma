import { ApiProperty } from '@nestjs/swagger';
import {
  ComplexCipherAlgorithm,
  ComplexCipherJobStatus,
} from '../complex-ciphers.types';
import { CipherMetricStatDto } from '../../classical-ciphers/dto/cipher-metric-stat.dto';
import { CipherStepResponseDto } from '../../classical-ciphers/dto/cipher-step-response.dto';

export class ComplexCipherJobResponseDto {
  @ApiProperty({ example: '0f50273c-4181-4496-9648-e84f355cedee' })
  id: string;

  @ApiProperty({ example: '5a0a9879-cc1c-40fc-87bb-13c33d9a4a7f' })
  parsedTextId: string;

  @ApiProperty({ enum: ComplexCipherAlgorithm })
  algorithm: ComplexCipherAlgorithm;

  @ApiProperty({ enum: ComplexCipherJobStatus })
  status: ComplexCipherJobStatus;

  @ApiProperty({ example: { mode: 'cbc', outputEncoding: 'hex' } })
  parameters: unknown;

  @ApiProperty({
    example: '7649abac8119b246cee98e9b12e9197d',
    nullable: true,
  })
  finalText?: string | null;

  @ApiProperty({ type: CipherStepResponseDto, isArray: true, nullable: true })
  steps?: CipherStepResponseDto[] | null;

  @ApiProperty({ example: { keySize: 128 }, nullable: true })
  metadata?: Record<string, unknown> | null;

  @ApiProperty({ type: CipherMetricStatDto, isArray: true, nullable: true })
  metricStats?: CipherMetricStatDto[] | null;

  @ApiProperty({ example: null, nullable: true })
  errorMessage?: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
