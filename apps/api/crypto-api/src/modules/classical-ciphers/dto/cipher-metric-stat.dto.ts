import { ApiProperty } from '@nestjs/swagger';

export type CipherMetricKey =
  | 'hurstExponent'
  | 'dfaAlpha'
  | 'wordFrequencyEntropy';

export class CipherMetricStatDto {
  @ApiProperty({ example: 'hurstExponent' })
  key: CipherMetricKey;

  @ApiProperty({ example: 'Hurst' })
  label: string;

  @ApiProperty({ example: 0.5427 })
  final: number;

  @ApiProperty({ example: 0.544 })
  mean: number;

  @ApiProperty({ example: 0.0015 })
  standardDeviation: number;

  @ApiProperty({ example: 0.5427 })
  min: number;

  @ApiProperty({ example: 0.5465 })
  max: number;
}
