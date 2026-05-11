import { ApiProperty } from '@nestjs/swagger';
import { CipherMetricStatDto } from './cipher-metric-stat.dto';
import { CipherStepResponseDto } from './cipher-step-response.dto';

export class CipherResponseDto {
  @ApiProperty({ example: 'khoor zruog' })
  finalText: string;

  @ApiProperty({ type: CipherStepResponseDto, isArray: true })
  steps: CipherStepResponseDto[];

  @ApiProperty({ type: CipherMetricStatDto, isArray: true })
  metricStats: CipherMetricStatDto[];
}
