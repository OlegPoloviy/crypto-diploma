import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

function parseOptionalBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (value === true || value === 'true' || value === '1' || value === 1) {
    return true;
  }

  if (value === false || value === 'false' || value === '0' || value === 0) {
    return false;
  }

  return undefined;
}

export class ClassicalWhiteningFieldsDto {
  @ApiPropertyOptional({
    default: false,
    description:
      'Apply classical pre/post whitening as extra modular shifts around the cipher',
  })
  @Transform(({ value }) => parseOptionalBoolean(value))
  @IsBoolean()
  @IsOptional()
  whiteningEnabled?: boolean;
}
