import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { AesMode, BinaryEncoding } from '../complex-ciphers.types';
import { XorWhiteningFieldsDto } from './xor-whitening-fields.dto';

export class DesEncryptDto extends XorWhiteningFieldsDto {
  @ApiProperty({
    example: 'hello world',
    description: 'Plain text to encrypt',
  })
  @IsString()
  @IsNotEmpty()
  plaintext: string;

  @ApiProperty({
    example: '133457799bbcdff1',
    description: 'DES key. Must decode to 8 bytes',
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
    example: '1234567890abcdef',
    description: 'Initialization vector for CBC mode. Must decode to 8 bytes',
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

export class DesDecryptDto extends XorWhiteningFieldsDto {
  @ApiProperty({
    example: '85e813540f0ab405',
    description: 'Ciphertext to decrypt',
  })
  @IsString()
  @IsNotEmpty()
  ciphertext: string;

  @ApiProperty({
    example: '133457799bbcdff1',
    description: 'DES key. Must decode to 8 bytes',
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
    example: '1234567890abcdef',
    description: 'Initialization vector for CBC mode. Must decode to 8 bytes',
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
