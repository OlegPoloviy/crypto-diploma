import { ApiProperty } from '@nestjs/swagger';
import {
  ClassicalCipherAlgorithm,
  ClassicalCipherJobStatus,
} from '../classical-ciphers.types';
import { CipherMetricStatDto } from './cipher-metric-stat.dto';
import { CipherStepResponseDto } from './cipher-step-response.dto';

export class CipherJobResponseDto {
  @ApiProperty({ example: '0f50273c-4181-4496-9648-e84f355cedee' })
  id: string;

  @ApiProperty({ example: '5a0a9879-cc1c-40fc-87bb-13c33d9a4a7f' })
  parsedTextId: string;

  @ApiProperty({ enum: ClassicalCipherAlgorithm })
  algorithm: ClassicalCipherAlgorithm;

  @ApiProperty({ enum: ClassicalCipherJobStatus })
  status: ClassicalCipherJobStatus;

  @ApiProperty({ example: { shift: 3 } })
  parameters: unknown;

  @ApiProperty({ example: 'khoor zruog', nullable: true })
  finalText?: string | null;

  @ApiProperty({ type: CipherStepResponseDto, isArray: true, nullable: true })
  steps?: CipherStepResponseDto[] | null;

  @ApiProperty({ type: CipherMetricStatDto, isArray: true, nullable: true })
  metricStats?: CipherMetricStatDto[] | null;

  @ApiProperty({ example: null, nullable: true })
  errorMessage?: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
