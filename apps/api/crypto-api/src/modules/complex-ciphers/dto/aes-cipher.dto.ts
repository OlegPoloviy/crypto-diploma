import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { AesMode, BinaryEncoding } from '../complex-ciphers.types';
import { XorWhiteningFieldsDto } from './xor-whitening-fields.dto';

export class AesEncryptDto extends XorWhiteningFieldsDto {
  @ApiProperty({
    example: 'hello world',
    description: 'Plain text to encrypt',
  })
  @IsString()
  @IsNotEmpty()
  plaintext: string;

  @ApiProperty({
    example: '000102030405060708090a0b0c0d0e0f',
    description: 'AES key. Must decode to 16, 24, or 32 bytes',
  })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiPropertyOptional({
    enum: BinaryEncoding,
    default: BinaryEncoding.UTF8,
    description: 'Encoding used to decode plaintext',
  })
  @IsEnum(BinaryEncoding)
  @IsOptional()
  inputEncoding?: BinaryEncoding;

  @ApiPropertyOptional({
    enum: BinaryEncoding,
    default: BinaryEncoding.HEX,
    description: 'Encoding used to decode key',
  })
  @IsEnum(BinaryEncoding)
  @IsOptional()
  keyEncoding?: BinaryEncoding;

  @ApiPropertyOptional({
    enum: BinaryEncoding,
    default: BinaryEncoding.HEX,
    description: 'Encoding used for returned ciphertext',
  })
  @IsEnum(BinaryEncoding)
  @IsOptional()
  outputEncoding?: BinaryEncoding;

  @ApiPropertyOptional({
    enum: AesMode,
    default: AesMode.CBC,
    description: 'Block cipher mode',
  })
  @IsEnum(AesMode)
  @IsOptional()
  mode?: AesMode;

  @ApiPropertyOptional({
    example: '101112131415161718191a1b1c1d1e1f',
    description: 'Initialization vector for CBC mode. Must decode to 16 bytes',
  })
  @IsString()
  @IsOptional()
  iv?: string;

  @ApiPropertyOptional({
    enum: BinaryEncoding,
    default: BinaryEncoding.HEX,
    description: 'Encoding used to decode iv',
  })
  @IsEnum(BinaryEncoding)
  @IsOptional()
  ivEncoding?: BinaryEncoding;
}

export class AesDecryptDto extends XorWhiteningFieldsDto {
  @ApiProperty({
    example: '7649abac8119b246cee98e9b12e9197d',
    description: 'Ciphertext to decrypt',
  })
  @IsString()
  @IsNotEmpty()
  ciphertext: string;

  @ApiProperty({
    example: '000102030405060708090a0b0c0d0e0f',
    description: 'AES key. Must decode to 16, 24, or 32 bytes',
  })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiPropertyOptional({
    enum: BinaryEncoding,
    default: BinaryEncoding.HEX,
    description: 'Encoding used to decode ciphertext',
  })
  @IsEnum(BinaryEncoding)
  @IsOptional()
  inputEncoding?: BinaryEncoding;

  @ApiPropertyOptional({
    enum: BinaryEncoding,
    default: BinaryEncoding.HEX,
    description: 'Encoding used to decode key',
  })
  @IsEnum(BinaryEncoding)
  @IsOptional()
  keyEncoding?: BinaryEncoding;

  @ApiPropertyOptional({
    enum: BinaryEncoding,
    default: BinaryEncoding.UTF8,
    description: 'Encoding used for returned plaintext',
  })
  @IsEnum(BinaryEncoding)
  @IsOptional()
  outputEncoding?: BinaryEncoding;

  @ApiPropertyOptional({
    enum: AesMode,
    default: AesMode.CBC,
    description: 'Block cipher mode',
  })
  @IsEnum(AesMode)
  @IsOptional()
  mode?: AesMode;

  @ApiPropertyOptional({
    example: '101112131415161718191a1b1c1d1e1f',
    description: 'Initialization vector for CBC mode. Must decode to 16 bytes',
  })
  @IsString()
  @IsOptional()
  iv?: string;

  @ApiPropertyOptional({
    enum: BinaryEncoding,
    default: BinaryEncoding.HEX,
    description: 'Encoding used to decode iv',
  })
  @IsEnum(BinaryEncoding)
  @IsOptional()
  ivEncoding?: BinaryEncoding;
}
