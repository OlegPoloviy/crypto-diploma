import {
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
  ApiBody,
  ApiBadRequestResponse,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiOkResponse,
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
import { ComplexCiphersService } from './complex-ciphers.service';
import {
  CreateAesCipherJobDto,
  CreateDesCipherJobDto,
  CreateKalynaCipherJobDto,
} from './dto/create-complex-cipher-job.dto';
import { AesDecryptDto, AesEncryptDto } from './dto/aes-cipher.dto';
import { AesResponseDto } from './dto/aes-response.dto';
import { ComplexCipherJobResponseDto } from './dto/complex-cipher-job-response.dto';
import { AesMode, BinaryEncoding } from './complex-ciphers.types';
import { DesDecryptDto, DesEncryptDto } from './dto/des-cipher.dto';
import { DesResponseDto } from './dto/des-response.dto';
import { KalynaDecryptDto, KalynaEncryptDto } from './dto/kalyna-cipher.dto';
import { KalynaResponseDto } from './dto/kalyna-response.dto';
import { KalynaBlockSize } from './complex-ciphers.types';
import { XorWhiteningFieldsDto } from './dto/xor-whitening-fields.dto';

class BatchAesFileDto extends XorWhiteningFieldsDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title: string;

  @IsEnum(TextFileType)
  @IsOptional()
  fileType?: TextFileType;

  @IsString()
  @IsNotEmpty()
  key: string;

  @IsEnum(BinaryEncoding)
  @IsOptional()
  keyEncoding?: BinaryEncoding;

  @IsEnum(BinaryEncoding)
  @IsOptional()
  outputEncoding?: BinaryEncoding;

  @IsEnum(AesMode)
  @IsOptional()
  mode?: AesMode;

  @IsString()
  @IsOptional()
  iv?: string;

  @IsEnum(BinaryEncoding)
  @IsOptional()
  ivEncoding?: BinaryEncoding;
}

class BatchKalynaFileDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title: string;

  @IsEnum(TextFileType)
  @IsOptional()
  fileType?: TextFileType;

  @IsString()
  @IsNotEmpty()
  key: string;

  @IsEnum(KalynaBlockSize)
  blockSizeBits: KalynaBlockSize;

  @IsEnum(BinaryEncoding)
  @IsOptional()
  keyEncoding?: BinaryEncoding;

  @IsEnum(BinaryEncoding)
  @IsOptional()
  outputEncoding?: BinaryEncoding;

  @IsEnum(AesMode)
  @IsOptional()
  mode?: AesMode;

  @IsString()
  @IsOptional()
  iv?: string;

  @IsEnum(BinaryEncoding)
  @IsOptional()
  ivEncoding?: BinaryEncoding;
}

class BatchDesFileDto extends XorWhiteningFieldsDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title: string;

  @IsEnum(TextFileType)
  @IsOptional()
  fileType?: TextFileType;

  @IsString()
  @IsNotEmpty()
  key: string;

  @IsEnum(BinaryEncoding)
  @IsOptional()
  keyEncoding?: BinaryEncoding;

  @IsEnum(BinaryEncoding)
  @IsOptional()
  outputEncoding?: BinaryEncoding;

  @IsEnum(AesMode)
  @IsOptional()
  mode?: AesMode;

  @IsString()
  @IsOptional()
  iv?: string;

  @IsEnum(BinaryEncoding)
  @IsOptional()
  ivEncoding?: BinaryEncoding;
}

@ApiTags('complex-ciphers')
@Controller('complex-ciphers')
export class ComplexCiphersController {
  constructor(private readonly complexCiphersService: ComplexCiphersService) {}

  @Get('jobs')
  @ApiOperation({ summary: 'List complex cipher jobs' })
  @ApiOkResponse({ type: ComplexCipherJobResponseDto, isArray: true })
  findAllJobs(): Promise<ComplexCipherJobResponseDto[]> {
    return this.complexCiphersService.findAllJobs();
  }

  @Get('jobs/:id')
  @ApiOperation({ summary: 'Get complex cipher job by id' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Cipher job id' })
  @ApiOkResponse({ type: ComplexCipherJobResponseDto })
  @ApiNotFoundResponse({ description: 'Complex cipher job not found' })
  findOneJob(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<ComplexCipherJobResponseDto> {
    return this.complexCiphersService.findOneJob(id);
  }

  @Delete('jobs/:id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Stop and delete complex cipher job by id' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Cipher job id' })
  @ApiNotFoundResponse({ description: 'Complex cipher job not found' })
  deleteJob(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<void> {
    return this.complexCiphersService.deleteJob(id);
  }

  @Post('aes/encrypt')
  @ApiOperation({
    summary: 'Encrypt data with a self-contained AES implementation',
  })
  @ApiCreatedResponse({ type: AesResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  encryptAes(@Body() body: AesEncryptDto): AesResponseDto {
    return this.complexCiphersService.encryptAes(body);
  }

  @Post('aes/decrypt')
  @ApiOperation({
    summary: 'Decrypt data with a self-contained AES implementation',
  })
  @ApiCreatedResponse({ type: AesResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  decryptAes(@Body() body: AesDecryptDto): AesResponseDto {
    return this.complexCiphersService.decryptAes(body);
  }

  @Post('des/encrypt')
  @ApiOperation({
    summary: 'Encrypt data with a self-contained DES implementation',
  })
  @ApiCreatedResponse({ type: DesResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  encryptDes(@Body() body: DesEncryptDto): DesResponseDto {
    return this.complexCiphersService.encryptDes(body);
  }

  @Post('des/decrypt')
  @ApiOperation({
    summary: 'Decrypt data with a self-contained DES implementation',
  })
  @ApiCreatedResponse({ type: DesResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  decryptDes(@Body() body: DesDecryptDto): DesResponseDto {
    return this.complexCiphersService.decryptDes(body);
  }

  @Post('kalyna/encrypt')
  @ApiOperation({
    summary: 'Encrypt data with Kalyna (DSTU 7624:2014)',
  })
  @ApiCreatedResponse({ type: KalynaResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  async encryptKalyna(
    @Body() body: KalynaEncryptDto,
  ): Promise<KalynaResponseDto> {
    return this.complexCiphersService.encryptKalyna(body);
  }

  @Post('kalyna/decrypt')
  @ApiOperation({
    summary: 'Decrypt data with Kalyna (DSTU 7624:2014)',
  })
  @ApiCreatedResponse({ type: KalynaResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  decryptKalyna(@Body() body: KalynaDecryptDto): KalynaResponseDto {
    return this.complexCiphersService.decryptKalyna(body);
  }

  @Post('jobs/aes')
  @ApiOperation({
    summary: 'Queue AES encryption for an existing parsed text',
  })
  @ApiCreatedResponse({ type: ComplexCipherJobResponseDto })
  @ApiBadRequestResponse({ description: 'Parsed text is not ready or invalid' })
  @ApiNotFoundResponse({ description: 'Parsed text not found' })
  createAesJob(
    @Body() body: CreateAesCipherJobDto,
  ): Promise<ComplexCipherJobResponseDto> {
    return this.complexCiphersService.createAesJob(body);
  }

  @Post('jobs/des')
  @ApiOperation({
    summary: 'Queue DES encryption for an existing parsed text',
  })
  @ApiCreatedResponse({ type: ComplexCipherJobResponseDto })
  @ApiBadRequestResponse({ description: 'Parsed text is not ready or invalid' })
  @ApiNotFoundResponse({ description: 'Parsed text not found' })
  createDesJob(
    @Body() body: CreateDesCipherJobDto,
  ): Promise<ComplexCipherJobResponseDto> {
    return this.complexCiphersService.createDesJob(body);
  }

  @Post('jobs/kalyna')
  @ApiOperation({
    summary: 'Queue Kalyna encryption for an existing parsed text',
  })
  @ApiCreatedResponse({ type: ComplexCipherJobResponseDto })
  @ApiBadRequestResponse({ description: 'Parsed text is not ready or invalid' })
  @ApiNotFoundResponse({ description: 'Parsed text not found' })
  createKalynaJob(
    @Body() body: CreateKalynaCipherJobDto,
  ): Promise<ComplexCipherJobResponseDto> {
    return this.complexCiphersService.createKalynaJob(body);
  }

  @Post('jobs/aes/files')
  @UseInterceptors(FilesInterceptor('files'))
  @ApiOperation({ summary: 'Upload multiple files and queue AES jobs' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', example: 'AES file batch' },
        fileType: {
          type: 'string',
          enum: Object.values(TextFileType),
          default: TextFileType.BINARY,
        },
        key: {
          type: 'string',
          example: '000102030405060708090a0b0c0d0e0f',
        },
        keyEncoding: {
          type: 'string',
          enum: Object.values(BinaryEncoding),
          default: BinaryEncoding.HEX,
        },
        outputEncoding: {
          type: 'string',
          enum: Object.values(BinaryEncoding),
          default: BinaryEncoding.HEX,
        },
        mode: {
          type: 'string',
          enum: Object.values(AesMode),
          default: AesMode.CBC,
        },
        iv: {
          type: 'string',
          example: '101112131415161718191a1b1c1d1e1f',
        },
        ivEncoding: {
          type: 'string',
          enum: Object.values(BinaryEncoding),
          default: BinaryEncoding.HEX,
        },
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
      required: ['title', 'files', 'key'],
    },
  })
  @ApiCreatedResponse({ type: ComplexCipherJobResponseDto, isArray: true })
  @ApiBadRequestResponse({ description: 'Files are missing or invalid' })
  createAesJobsFromFiles(
    @Body() body: BatchAesFileDto,
    @UploadedFiles() files?: { buffer: Buffer; originalname?: string }[],
  ): Promise<ComplexCipherJobResponseDto[]> {
    return this.complexCiphersService.createAesJobsFromFiles(
      body.title,
      files,
      body.fileType ?? TextFileType.BINARY,
      {
        key: body.key,
        keyEncoding: body.keyEncoding,
        outputEncoding: body.outputEncoding,
        mode: body.mode,
        iv: body.mode === AesMode.ECB ? undefined : body.iv,
        ivEncoding: body.ivEncoding,
        whiteningEnabled: body.whiteningEnabled,
        kPre: body.kPre,
        kPost: body.kPost,
        whiteningKeyEncoding: body.whiteningKeyEncoding,
      },
    );
  }

  @Post('jobs/des/files')
  @UseInterceptors(FilesInterceptor('files'))
  @ApiOperation({ summary: 'Upload multiple files and queue DES jobs' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', example: 'DES file batch' },
        fileType: {
          type: 'string',
          enum: Object.values(TextFileType),
          default: TextFileType.BINARY,
        },
        key: {
          type: 'string',
          example: '133457799bbcdff1',
        },
        keyEncoding: {
          type: 'string',
          enum: Object.values(BinaryEncoding),
          default: BinaryEncoding.HEX,
        },
        outputEncoding: {
          type: 'string',
          enum: Object.values(BinaryEncoding),
          default: BinaryEncoding.HEX,
        },
        mode: {
          type: 'string',
          enum: Object.values(AesMode),
          default: AesMode.CBC,
        },
        iv: {
          type: 'string',
          example: '1234567890abcdef',
        },
        ivEncoding: {
          type: 'string',
          enum: Object.values(BinaryEncoding),
          default: BinaryEncoding.HEX,
        },
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
      required: ['title', 'files', 'key'],
    },
  })
  @ApiCreatedResponse({ type: ComplexCipherJobResponseDto, isArray: true })
  @ApiBadRequestResponse({ description: 'Files are missing or invalid' })
  createDesJobsFromFiles(
    @Body() body: BatchDesFileDto,
    @UploadedFiles() files?: { buffer: Buffer; originalname?: string }[],
  ): Promise<ComplexCipherJobResponseDto[]> {
    return this.complexCiphersService.createDesJobsFromFiles(
      body.title,
      files,
      body.fileType ?? TextFileType.BINARY,
      {
        key: body.key,
        keyEncoding: body.keyEncoding,
        outputEncoding: body.outputEncoding,
        mode: body.mode,
        iv: body.mode === AesMode.ECB ? undefined : body.iv,
        ivEncoding: body.ivEncoding,
        whiteningEnabled: body.whiteningEnabled,
        kPre: body.kPre,
        kPost: body.kPost,
        whiteningKeyEncoding: body.whiteningKeyEncoding,
      },
    );
  }

  @Post('jobs/kalyna/files')
  @UseInterceptors(FilesInterceptor('files'))
  @ApiOperation({ summary: 'Upload multiple files and queue Kalyna jobs' })
  @ApiConsumes('multipart/form-data')
  @ApiCreatedResponse({ type: ComplexCipherJobResponseDto, isArray: true })
  @ApiBadRequestResponse({ description: 'Files are missing or invalid' })
  createKalynaJobsFromFiles(
    @Body() body: BatchKalynaFileDto,
    @UploadedFiles() files?: { buffer: Buffer; originalname?: string }[],
  ): Promise<ComplexCipherJobResponseDto[]> {
    return this.complexCiphersService.createKalynaJobsFromFiles(
      body.title,
      files,
      body.fileType ?? TextFileType.BINARY,
      {
        key: body.key,
        blockSizeBits: body.blockSizeBits,
        keyEncoding: body.keyEncoding,
        outputEncoding: body.outputEncoding,
        mode: body.mode,
        iv: body.mode === AesMode.ECB ? undefined : body.iv,
        ivEncoding: body.ivEncoding,
      },
    );
  }
}
