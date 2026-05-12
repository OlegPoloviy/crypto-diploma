import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { TextFileType } from '../text-parser/text-parser.service';
import { ClassicalCiphersService } from './classical-ciphers.service';
import { CaesarCipherDto } from './dto/caesar-cipher.dto';
import { CipherJobResponseDto } from './dto/cipher-job-response.dto';
import { CipherResponseDto } from './dto/cipher-response.dto';
import {
  CreateCaesarCipherJobDto,
  CreateVigenereCipherJobDto,
  CreateVigenereKeyLengthsJobDto,
} from './dto/create-cipher-job.dto';
import {
  VigenereCipherDto,
  VigenereKeyLengthsDto,
} from './dto/vigenere-cipher.dto';

class BatchCipherFileDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title: string;

  @IsEnum(TextFileType)
  @IsOptional()
  fileType?: TextFileType;

  @IsString()
  @IsOptional()
  shift?: string;

  @IsString()
  @IsOptional()
  maxSteps?: string;

  @IsString()
  @IsOptional()
  key?: string;

  @IsString()
  @IsOptional()
  keyLengths?: string;
}

const batchFilesSchema = {
  type: 'object',
  properties: {
    title: { type: 'string', example: 'Cipher batch' },
    fileType: {
      type: 'string',
      enum: Object.values(TextFileType),
      default: TextFileType.BINARY,
    },
    files: {
      type: 'array',
      items: { type: 'string', format: 'binary' },
    },
  },
  required: ['title', 'files'],
};

@ApiTags('classical-ciphers')
@Controller('classical-ciphers')
export class ClassicalCiphersController {
  constructor(private readonly ciphersService: ClassicalCiphersService) {}

  @Get('jobs')
  @ApiOperation({ summary: 'List classical cipher jobs' })
  @ApiOkResponse({ type: CipherJobResponseDto, isArray: true })
  findAllJobs(): Promise<CipherJobResponseDto[]> {
    return this.ciphersService.findAllJobs();
  }

  @Get('jobs/:id')
  @ApiOperation({ summary: 'Get classical cipher job by id' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Cipher job id' })
  @ApiOkResponse({ type: CipherJobResponseDto })
  @ApiNotFoundResponse({ description: 'Cipher job not found' })
  findOneJob(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<CipherJobResponseDto> {
    return this.ciphersService.findOneJob(id);
  }

  @Delete('jobs/:id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Stop and delete classical cipher job by id' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Cipher job id' })
  @ApiNotFoundResponse({ description: 'Cipher job not found' })
  deleteJob(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<void> {
    return this.ciphersService.deleteJob(id);
  }

  @Post('caesar')
  @ApiOperation({
    summary: 'Encrypt text with Caesar cipher and save word-by-word states',
  })
  @ApiCreatedResponse({ type: CipherResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  encryptCaesar(@Body() body: CaesarCipherDto): CipherResponseDto {
    return this.ciphersService.encryptCaesar(body.text, body.shift);
  }

  @Post('vigenere/key-symbols')
  @ApiOperation({
    summary: 'Encrypt text with Vigenere cipher step-by-step by key symbols',
  })
  @ApiCreatedResponse({ type: CipherResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  encryptVigenereByKeySymbols(
    @Body() body: VigenereCipherDto,
  ): CipherResponseDto {
    return this.ciphersService.encryptVigenereByKeySymbols(body.text, body.key);
  }

  @Post('vigenere/key-lengths')
  @ApiOperation({
    summary: 'Compare Vigenere encryption states for different key lengths',
  })
  @ApiCreatedResponse({ type: CipherResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  encryptVigenereByKeyLengths(
    @Body() body: VigenereKeyLengthsDto,
  ): CipherResponseDto {
    return this.ciphersService.encryptVigenereByKeyLengths(
      body.text,
      body.key,
      body.keyLengths,
    );
  }

  @Post('jobs/caesar')
  @ApiOperation({
    summary: 'Queue Caesar cipher for an existing parsed text',
  })
  @ApiCreatedResponse({ type: CipherJobResponseDto })
  @ApiBadRequestResponse({ description: 'Parsed text is not ready or invalid' })
  @ApiNotFoundResponse({ description: 'Parsed text not found' })
  createCaesarJob(
    @Body() body: CreateCaesarCipherJobDto,
  ): Promise<CipherJobResponseDto> {
    return this.ciphersService.createCaesarJob(
      body.parsedTextId,
      body.shift,
      body.maxSteps,
    );
  }

  @Post('jobs/caesar/files')
  @UseInterceptors(FilesInterceptor('files'))
  @ApiOperation({ summary: 'Upload multiple files and queue Caesar jobs' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      ...batchFilesSchema,
      properties: {
        ...batchFilesSchema.properties,
        shift: { type: 'number', example: 3 },
        maxSteps: { type: 'number', example: 40 },
      },
      required: ['title', 'files', 'shift'],
    },
  })
  @ApiCreatedResponse({ type: CipherJobResponseDto, isArray: true })
  @ApiBadRequestResponse({ description: 'Files are missing or invalid' })
  createCaesarJobsFromFiles(
    @Body() body: BatchCipherFileDto,
    @UploadedFiles() files?: { buffer: Buffer; originalname?: string }[],
  ): Promise<CipherJobResponseDto[]> {
    return this.ciphersService.createCaesarJobsFromFiles(
      body.title,
      files,
      body.fileType ?? TextFileType.BINARY,
      parseRequiredInteger(body.shift, 'shift'),
      body.maxSteps ? Number.parseInt(body.maxSteps, 10) : undefined,
    );
  }

  @Post('jobs/vigenere/key-symbols')
  @ApiOperation({
    summary: 'Queue Vigenere key-symbol steps for an existing parsed text',
  })
  @ApiCreatedResponse({ type: CipherJobResponseDto })
  @ApiBadRequestResponse({ description: 'Parsed text is not ready or invalid' })
  @ApiNotFoundResponse({ description: 'Parsed text not found' })
  createVigenereKeySymbolsJob(
    @Body() body: CreateVigenereCipherJobDto,
  ): Promise<CipherJobResponseDto> {
    return this.ciphersService.createVigenereKeySymbolsJob(
      body.parsedTextId,
      body.key,
    );
  }

  @Post('jobs/vigenere/key-symbols/files')
  @UseInterceptors(FilesInterceptor('files'))
  @ApiOperation({
    summary: 'Upload multiple files and queue Vigenere key-symbol jobs',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      ...batchFilesSchema,
      properties: {
        ...batchFilesSchema.properties,
        key: { type: 'string', example: 'KEY' },
      },
      required: ['title', 'files', 'key'],
    },
  })
  @ApiCreatedResponse({ type: CipherJobResponseDto, isArray: true })
  @ApiBadRequestResponse({ description: 'Files are missing or invalid' })
  createVigenereKeySymbolsJobsFromFiles(
    @Body() body: BatchCipherFileDto,
    @UploadedFiles() files?: { buffer: Buffer; originalname?: string }[],
  ): Promise<CipherJobResponseDto[]> {
    return this.ciphersService.createVigenereKeySymbolsJobsFromFiles(
      body.title,
      files,
      body.fileType ?? TextFileType.BINARY,
      body.key ?? '',
    );
  }

  @Post('jobs/vigenere/key-lengths')
  @ApiOperation({
    summary: 'Queue Vigenere key-length comparison for an existing parsed text',
  })
  @ApiCreatedResponse({ type: CipherJobResponseDto })
  @ApiBadRequestResponse({ description: 'Parsed text is not ready or invalid' })
  @ApiNotFoundResponse({ description: 'Parsed text not found' })
  createVigenereKeyLengthsJob(
    @Body() body: CreateVigenereKeyLengthsJobDto,
  ): Promise<CipherJobResponseDto> {
    return this.ciphersService.createVigenereKeyLengthsJob(
      body.parsedTextId,
      body.key,
      body.keyLengths,
    );
  }

  @Post('jobs/vigenere/key-lengths/files')
  @UseInterceptors(FilesInterceptor('files'))
  @ApiOperation({
    summary: 'Upload multiple files and queue Vigenere key-length jobs',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      ...batchFilesSchema,
      properties: {
        ...batchFilesSchema.properties,
        key: { type: 'string', example: 'KEY' },
        keyLengths: { type: 'string', example: '1,3,5,10,20' },
      },
      required: ['title', 'files', 'key'],
    },
  })
  @ApiCreatedResponse({ type: CipherJobResponseDto, isArray: true })
  @ApiBadRequestResponse({ description: 'Files are missing or invalid' })
  createVigenereKeyLengthsJobsFromFiles(
    @Body() body: BatchCipherFileDto,
    @UploadedFiles() files?: { buffer: Buffer; originalname?: string }[],
  ): Promise<CipherJobResponseDto[]> {
    return this.ciphersService.createVigenereKeyLengthsJobsFromFiles(
      body.title,
      files,
      body.fileType ?? TextFileType.BINARY,
      body.key ?? '',
      parseKeyLengths(body.keyLengths),
    );
  }
}

function parseKeyLengths(value?: string): number[] | undefined {
  if (!value) {
    return undefined;
  }

  return Array.from(
    new Set(
      value
        .split(',')
        .map((item) => Number.parseInt(item.trim(), 10))
        .filter((item) => Number.isFinite(item) && item > 0),
    ),
  ).sort((a, b) => a - b);
}

function parseRequiredInteger(
  value: string | undefined,
  fieldName: string,
): number {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed)) {
    throw new BadRequestException(`${fieldName} is required`);
  }

  return parsed;
}
