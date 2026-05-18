import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { CaesarCipherDto } from './caesar-cipher.dto';
import {
  VigenereCipherDto,
  VigenereKeyLengthsDto,
} from './vigenere-cipher.dto';
import { ClassicalCipherOperation } from '../classical-ciphers.types';

class ParsedTextCipherDto {
  @ApiProperty({
    example: '5a0a9879-cc1c-40fc-87bb-13c33d9a4a7f',
    description: 'Existing parsed text id from text-parser',
  })
  @IsUUID('4')
  parsedTextId: string;

  @ApiPropertyOptional({
    enum: ClassicalCipherOperation,
    default: ClassicalCipherOperation.ENCRYPT,
  })
  @IsEnum(ClassicalCipherOperation)
  @IsOptional()
  operation?: ClassicalCipherOperation;

  @ApiPropertyOptional({
    example: '0f50273c-4181-4496-9648-e84f355cedee',
    description:
      'Completed classical cipher job to use as ciphertext input for decrypt jobs',
  })
  @IsUUID('4')
  @IsOptional()
  sourceJobId?: string;
}

export class CreateCaesarCipherJobDto extends OmitType(CaesarCipherDto, [
  'text',
] as const) {
  @ApiProperty({
    example: '5a0a9879-cc1c-40fc-87bb-13c33d9a4a7f',
    description: 'Existing parsed text id from text-parser',
  })
  @IsUUID('4')
  parsedTextId: string;

  @ApiPropertyOptional({
    enum: ClassicalCipherOperation,
    default: ClassicalCipherOperation.ENCRYPT,
  })
  @IsEnum(ClassicalCipherOperation)
  @IsOptional()
  operation?: ClassicalCipherOperation;

  @ApiPropertyOptional({
    example: '0f50273c-4181-4496-9648-e84f355cedee',
    description:
      'Completed classical cipher job to use as ciphertext input for decrypt jobs',
  })
  @IsUUID('4')
  @IsOptional()
  sourceJobId?: string;

  @ApiProperty({
    example: 40,
    required: false,
    description:
      'Maximum number of intermediate checkpoints saved for large DB texts',
  })
  @IsInt()
  @Min(1)
  @Max(500)
  @IsOptional()
  maxSteps?: number;
}

export class CreateVigenereCipherJobDto
  extends OmitType(VigenereCipherDto, ['text'] as const)
  implements ParsedTextCipherDto
{
  @ApiProperty({
    example: '5a0a9879-cc1c-40fc-87bb-13c33d9a4a7f',
    description: 'Existing parsed text id from text-parser',
  })
  @IsUUID('4')
  parsedTextId: string;

  @ApiPropertyOptional({
    enum: ClassicalCipherOperation,
    default: ClassicalCipherOperation.ENCRYPT,
  })
  @IsEnum(ClassicalCipherOperation)
  @IsOptional()
  operation?: ClassicalCipherOperation;

  @ApiPropertyOptional({
    example: '0f50273c-4181-4496-9648-e84f355cedee',
    description:
      'Completed classical cipher job to use as ciphertext input for decrypt jobs',
  })
  @IsUUID('4')
  @IsOptional()
  sourceJobId?: string;
}

export class CreateVigenereKeyLengthsJobDto
  extends OmitType(VigenereKeyLengthsDto, ['text'] as const)
  implements ParsedTextCipherDto
{
  @ApiProperty({
    example: '5a0a9879-cc1c-40fc-87bb-13c33d9a4a7f',
    description: 'Existing parsed text id from text-parser',
  })
  @IsUUID('4')
  parsedTextId: string;

  @ApiPropertyOptional({
    enum: ClassicalCipherOperation,
    default: ClassicalCipherOperation.ENCRYPT,
  })
  @IsEnum(ClassicalCipherOperation)
  @IsOptional()
  operation?: ClassicalCipherOperation;

  @ApiPropertyOptional({
    example: '0f50273c-4181-4496-9648-e84f355cedee',
    description:
      'Completed classical cipher job to use as ciphertext input for decrypt jobs',
  })
  @IsUUID('4')
  @IsOptional()
  sourceJobId?: string;
}
