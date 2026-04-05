import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AlgorithmType } from '../../../../../../../shared/types/algorith.types';
import { CipherMode } from '../experiments.entity';

export class CreateExperimentDto {
  @ApiProperty({
    example: 'AES benchmark run',
    maxLength: 150,
    description: 'Human-readable title for the experiment',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title: string;

  @ApiProperty({
    example: 'Plaintext payload to encrypt',
    description: 'Input text processed by the experiment',
  })
  @IsString()
  @IsNotEmpty()
  inputText: string;

  @ApiProperty({ enum: AlgorithmType, example: AlgorithmType.AES })
  @IsEnum(AlgorithmType)
  algorithm: AlgorithmType;

  @ApiProperty({ enum: CipherMode, example: CipherMode.CBC })
  @IsEnum(CipherMode)
  mode: CipherMode;

  @ApiProperty({
    example: false,
    description: 'Whether whitening is applied',
  })
  @IsBoolean()
  whiteningEnabled: boolean;
}
