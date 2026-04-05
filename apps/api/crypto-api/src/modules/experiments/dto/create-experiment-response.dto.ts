import { ApiProperty } from '@nestjs/swagger';

export class CreateExperimentResponseDto {
  @ApiProperty({
    example: true,
    description: 'Whether the experiment was created and saved',
  })
  created: boolean;
}
