import { ApiProperty } from '@nestjs/swagger';

export class CipherStepResponseDto {
  @ApiProperty({ example: 2 })
  step: number;

  @ApiProperty({ example: "Applied key symbol 'E' (2 of 3)" })
  description: string;

  @ApiProperty({ example: 'Kflmo world' })
  text: string;

  @ApiProperty({ example: 0.71 })
  hurstExponent: number;

  @ApiProperty({ example: 0.68 })
  dfaAlpha: number;

  @ApiProperty({ example: 4.2 })
  wordFrequencyEntropy: number;
}
