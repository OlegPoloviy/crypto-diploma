import { ApiProperty } from '@nestjs/swagger';
import { AlgorithmType } from '../../../../../../../shared/types/algorith.types';
import { ExperimentStatus } from '../../../../../../../shared/types/experiment.status';
import { CipherMode } from '../experiments.entity';

export class ExperimentResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  inputText: string;

  @ApiProperty({ enum: AlgorithmType })
  algorithm: AlgorithmType;

  @ApiProperty({ enum: CipherMode })
  mode: CipherMode;

  @ApiProperty()
  whiteningEnabled: boolean;

  @ApiProperty({ enum: ExperimentStatus })
  status: ExperimentStatus;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt: Date;
}
