import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import {
  AesMode,
  BinaryEncoding,
  KalynaBlockSize,
} from '../complex-ciphers.types';

export class KalynaEncryptDto {
  @ApiProperty({
    example: 'hello world',
    description: 'Plain text to encrypt',
  })
  @IsString()
  @IsNotEmpty()
  plaintext: string;

  @ApiProperty({
    example: '000102030405060708090a0b0c0d0e0f',
    description: 'Kalyna key (length must match block size configuration)',
  })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({
    enum: KalynaBlockSize,
    example: KalynaBlockSize.BITS_128,
    description: 'Kalyna block size in bits',
  })
  @IsEnum(KalynaBlockSize)
  blockSizeBits: KalynaBlockSize;

  @ApiPropertyOptional({
    enum: BinaryEncoding,
    default: BinaryEncoding.UTF8,
  })
  @IsEnum(BinaryEncoding)
  @IsOptional()
  inputEncoding?: BinaryEncoding;

  @ApiPropertyOptional({
    enum: BinaryEncoding,
    default: BinaryEncoding.HEX,
  })
  @IsEnum(BinaryEncoding)
  @IsOptional()
  keyEncoding?: BinaryEncoding;

  @ApiPropertyOptional({
    enum: BinaryEncoding,
    default: BinaryEncoding.HEX,
  })
  @IsEnum(BinaryEncoding)
  @IsOptional()
  outputEncoding?: BinaryEncoding;

  @ApiPropertyOptional({ enum: AesMode, default: AesMode.CBC })
  @IsEnum(AesMode)
  @IsOptional()
  mode?: AesMode;

  @ApiPropertyOptional({
    example: '101112131415161718191a1b1c1d1e1f',
    description: 'IV for CBC (length equals block size in bytes)',
  })
  @IsString()
  @IsOptional()
  iv?: string;

  @ApiPropertyOptional({ enum: BinaryEncoding, default: BinaryEncoding.HEX })
  @IsEnum(BinaryEncoding)
  @IsOptional()
  ivEncoding?: BinaryEncoding;
}

export class KalynaDecryptDto {
  @ApiProperty({ example: '81bf1c7d779bac20e1c9ea39b4d2ad06' })
  @IsString()
  @IsNotEmpty()
  ciphertext: string;

  @ApiProperty({ example: '000102030405060708090a0b0c0d0e0f' })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({ enum: KalynaBlockSize, example: KalynaBlockSize.BITS_128 })
  @IsEnum(KalynaBlockSize)
  blockSizeBits: KalynaBlockSize;

  @ApiPropertyOptional({ enum: BinaryEncoding, default: BinaryEncoding.HEX })
  @IsEnum(BinaryEncoding)
  @IsOptional()
  inputEncoding?: BinaryEncoding;

  @ApiPropertyOptional({ enum: BinaryEncoding, default: BinaryEncoding.HEX })
  @IsEnum(BinaryEncoding)
  @IsOptional()
  keyEncoding?: BinaryEncoding;

  @ApiPropertyOptional({ enum: BinaryEncoding, default: BinaryEncoding.UTF8 })
  @IsEnum(BinaryEncoding)
  @IsOptional()
  outputEncoding?: BinaryEncoding;

  @ApiPropertyOptional({ enum: AesMode, default: AesMode.CBC })
  @IsEnum(AesMode)
  @IsOptional()
  mode?: AesMode;

  @ApiPropertyOptional({ example: '101112131415161718191a1b1c1d1e1f' })
  @IsString()
  @IsOptional()
  iv?: string;

  @ApiPropertyOptional({ enum: BinaryEncoding, default: BinaryEncoding.HEX })
  @IsEnum(BinaryEncoding)
  @IsOptional()
  ivEncoding?: BinaryEncoding;
}
