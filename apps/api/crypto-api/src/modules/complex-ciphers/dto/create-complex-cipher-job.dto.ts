import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { AesMode, BinaryEncoding } from '../complex-ciphers.types';

export class CreateAesCipherJobDto {
  @ApiProperty({
    example: '5a0a9879-cc1c-40fc-87bb-13c33d9a4a7f',
    description: 'Existing parsed text id from text-parser',
  })
  @IsUUID('4')
  parsedTextId: string;

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
