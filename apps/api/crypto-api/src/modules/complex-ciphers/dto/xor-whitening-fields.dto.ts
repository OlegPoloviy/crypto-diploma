import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { BinaryEncoding } from '../complex-ciphers.types';

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

export class XorWhiteningFieldsDto {
  @ApiPropertyOptional({
    default: false,
    description:
      'Apply XOR pre/post whitening: Y = E_K(X ⊕ K_pre) ⊕ K_post',
  })
  @Transform(({ value, obj, key }) => {
    const source = obj as Record<string, unknown> | undefined;
    if (source && key in source && source[key] === false) {
      return false;
    }

    return parseOptionalBoolean(value);
  })
  @IsBoolean()
  @IsOptional()
  whiteningEnabled?: boolean;

  @ApiPropertyOptional({
    example: 'f0e1d2c3b4a5968778695a4b3c2d1e0f',
    description: 'Pre-whitening key K_pre (block size bytes)',
  })
  @IsString()
  @IsOptional()
  kPre?: string;

  @ApiPropertyOptional({
    example: '0f1e2d3c4b5a69788796a5b4c3d2e1f0',
    description: 'Post-whitening key K_post (block size bytes)',
  })
  @IsString()
  @IsOptional()
  kPost?: string;

  @ApiPropertyOptional({
    enum: BinaryEncoding,
    default: BinaryEncoding.HEX,
    description: 'Encoding used to decode whitening keys',
  })
  @IsEnum(BinaryEncoding)
  @IsOptional()
  whiteningKeyEncoding?: BinaryEncoding;
}
