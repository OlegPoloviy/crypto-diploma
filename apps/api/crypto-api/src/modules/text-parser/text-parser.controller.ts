import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProperty,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { BaselineSetResponseDto } from './dto/baseline-set-response.dto';
import { BaselineSetTextDto } from './dto/baseline-set-text.dto';
import { CreateParsedTextResponseDto } from './dto/create-parsed-text-response.dto';
import { GenerateRandomBytesDto } from './dto/generate-random.dto';
import { GenerateRandomTextDto } from './dto/generate-random-text.dto';
import { ParsedTextContentResponseDto } from './dto/parsed-text-content-response.dto';
import { ParseTextDto } from './dto/parse-text.dto';
import { ShuffleTextDto } from './dto/shuffle-text.dto';
import { ParsedTextCorpusKind } from './parsed-text.entity';
import {
  ListParsedTextsQuery,
  TextFileType,
  TextParserService,
} from './text-parser.service';
import { TextPreprocessMode } from './text-parser.util';
import { MAX_RANDOM_BYTE_LENGTH } from './dto/generate-random.dto';

class ParseFileDto {
  @ApiProperty({
    example: 'Sample corpus',
    maxLength: 150,
    description: 'Human-readable title for the parsed text',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title: string;

  @ApiProperty({
    enum: TextFileType,
    default: TextFileType.PLAIN_TEXT,
    description: 'Declared text file type',
  })
  @IsEnum(TextFileType)
  @IsOptional()
  fileType?: TextFileType;

  @ApiProperty({
    enum: TextPreprocessMode,
    default: TextPreprocessMode.AUTO,
    required: false,
  })
  @IsEnum(TextPreprocessMode)
  @IsOptional()
  preprocess?: TextPreprocessMode;
}

class ShuffleFileDto extends ParseFileDto {
  @ApiProperty({ required: false })
  @IsInt()
  @IsOptional()
  seed?: number;
}

class ShuffleParsedTextDto {
  @ApiProperty({
    example: 'Moby Dick shuffled',
    maxLength: 150,
    description: 'Human-readable title for the shuffled corpus',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title: string;

  @ApiProperty({ required: false })
  @IsInt()
  @IsOptional()
  seed?: number;
}

class BaselineSetFileDto extends ParseFileDto {
  @ApiProperty({
    required: false,
    description: 'Random byte length; defaults to file UTF-8 byte length',
  })
  @IsInt()
  @Min(1)
  @Max(MAX_RANDOM_BYTE_LENGTH)
  @IsOptional()
  randomByteLength?: number;

  @ApiProperty({ required: false })
  @IsInt()
  @IsOptional()
  seed?: number;
}

class ListParsedTextsQueryDto {
  @ApiProperty({ enum: ParsedTextCorpusKind, required: false })
  @IsEnum(ParsedTextCorpusKind)
  @IsOptional()
  corpusKind?: ParsedTextCorpusKind;

  @ApiProperty({ format: 'uuid', required: false })
  @IsOptional()
  baselineSetId?: string;
}

@ApiTags('text-parser')
@Controller('text-parser')
export class TextParserController {
  constructor(private readonly textParserService: TextParserService) {}

  @Get()
  @ApiOperation({ summary: 'List parsed text jobs' })
  @ApiQuery({ name: 'corpusKind', enum: ParsedTextCorpusKind, required: false })
  @ApiQuery({ name: 'baselineSetId', required: false, format: 'uuid' })
  @ApiOkResponse({
    description: 'Parsed texts ordered by newest first',
    type: CreateParsedTextResponseDto,
    isArray: true,
  })
  findAll(
    @Query() query: ListParsedTextsQueryDto,
  ): Promise<CreateParsedTextResponseDto[]> {
    return this.textParserService.findAll(query as ListParsedTextsQuery);
  }

  @Get(':id/content')
  @ApiOperation({ summary: 'Get stored corpus content for download' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Parsed text id' })
  @ApiOkResponse({ type: ParsedTextContentResponseDto })
  @ApiNotFoundResponse({ description: 'Parsed text not found' })
  @ApiBadRequestResponse({
    description: 'Corpus is not ready or has no stored content',
  })
  getContent(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<ParsedTextContentResponseDto> {
    return this.textParserService.getContent(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get parsed text job by id' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Parsed text id' })
  @ApiOkResponse({ type: CreateParsedTextResponseDto })
  @ApiNotFoundResponse({ description: 'Parsed text not found' })
  findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<CreateParsedTextResponseDto> {
    return this.textParserService.findOne(id);
  }

  @Post('text')
  @ApiOperation({
    summary: 'Parse plain text and compute baseline metrics synchronously',
  })
  @ApiCreatedResponse({
    description: 'Parsed text with metrics',
    type: CreateParsedTextResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  parseText(@Body() body: ParseTextDto): Promise<CreateParsedTextResponseDto> {
    return this.textParserService.createFromText(
      body.title,
      body.text,
      body.originalFileName,
      body.preprocess,
    );
  }

  @Post('random')
  @ApiOperation({ summary: 'Generate random bytes baseline with metrics' })
  @ApiCreatedResponse({ type: CreateParsedTextResponseDto })
  createRandom(
    @Body() body: GenerateRandomBytesDto,
  ): Promise<CreateParsedTextResponseDto> {
    return this.textParserService.createRandomBytes(body);
  }

  @Post('random-text')
  @ApiOperation({ summary: 'Generate monkey text with metrics' })
  @ApiCreatedResponse({ type: CreateParsedTextResponseDto })
  createRandomText(
    @Body() body: GenerateRandomTextDto,
  ): Promise<CreateParsedTextResponseDto> {
    return this.textParserService.createRandomText(body);
  }

  @Post('shuffle')
  @ApiOperation({ summary: 'Shuffle natural text words and compute metrics' })
  @ApiCreatedResponse({ type: CreateParsedTextResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  createShuffledText(
    @Body() body: ShuffleTextDto,
  ): Promise<CreateParsedTextResponseDto> {
    return this.textParserService.createShuffledText(body);
  }

  @Post('shuffle/file')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Upload text, shuffle words, and compute metrics',
  })
  @ApiConsumes('multipart/form-data')
  @ApiCreatedResponse({ type: CreateParsedTextResponseDto })
  @ApiBadRequestResponse({ description: 'File is missing or invalid' })
  createShuffledTextFromFile(
    @Body() body: ShuffleFileDto,
    @UploadedFile() file?: { buffer: Buffer; originalname?: string },
  ): Promise<CreateParsedTextResponseDto> {
    return this.textParserService.createShuffledTextFromFile(
      body.title,
      file,
      body.fileType,
      body.preprocess,
      body.seed,
    );
  }

  @Post('shuffle/:id')
  @ApiOperation({
    summary: 'Shuffle an already parsed text corpus and compute metrics',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Parsed text id' })
  @ApiCreatedResponse({ type: CreateParsedTextResponseDto })
  @ApiBadRequestResponse({ description: 'Corpus is not ready or invalid' })
  @ApiNotFoundResponse({ description: 'Parsed text not found' })
  createShuffledTextFromParsedText(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: ShuffleParsedTextDto,
  ): Promise<CreateParsedTextResponseDto> {
    return this.textParserService.createShuffledTextFromParsedText(
      id,
      body.title,
      body.seed,
    );
  }

  @Post('baseline-set')
  @ApiOperation({
    summary: 'Create natural text + random bytes baseline pair',
  })
  @ApiCreatedResponse({ type: BaselineSetResponseDto })
  createBaselineSet(
    @Body() body: BaselineSetTextDto,
  ): Promise<BaselineSetResponseDto> {
    return this.textParserService.createBaselineSetFromText(body);
  }

  @Post('baseline-set/file')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Create baseline pair from an uploaded plain text file',
  })
  @ApiConsumes('multipart/form-data')
  @ApiCreatedResponse({ type: BaselineSetResponseDto })
  async createBaselineSetFromFile(
    @Body() body: BaselineSetFileDto,
    @UploadedFile() file?: { buffer: Buffer; originalname?: string },
  ): Promise<BaselineSetResponseDto> {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    return this.textParserService.createBaselineSetFromText({
      title: body.title,
      text: file.buffer.toString('utf8'),
      preprocess: body.preprocess,
      randomByteLength: body.randomByteLength,
      seed: body.seed,
      originalFileName: file.originalname,
    });
  }

  @Post('file')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload and parse a text file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', example: 'Sample corpus' },
        fileType: {
          type: 'string',
          enum: Object.values(TextFileType),
        },
        preprocess: {
          type: 'string',
          enum: Object.values(TextPreprocessMode),
        },
        file: { type: 'string', format: 'binary' },
      },
      required: ['title', 'file'],
    },
  })
  @ApiCreatedResponse({
    description: 'File parsed with metrics',
    type: CreateParsedTextResponseDto,
  })
  @ApiBadRequestResponse({ description: 'File is missing or invalid' })
  parseFile(
    @Body() body: ParseFileDto,
    @UploadedFile() file?: { buffer: Buffer; originalname?: string },
  ): Promise<CreateParsedTextResponseDto> {
    return this.textParserService.createFromFile(
      body.title,
      file,
      body.fileType,
      body.preprocess,
    );
  }

  @Post('files')
  @UseInterceptors(FilesInterceptor('files'))
  @ApiOperation({ summary: 'Upload and parse multiple text files' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', example: 'Batch upload' },
        fileType: {
          type: 'string',
          enum: Object.values(TextFileType),
        },
        preprocess: {
          type: 'string',
          enum: Object.values(TextPreprocessMode),
        },
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
      required: ['title', 'files'],
    },
  })
  @ApiCreatedResponse({
    description: 'Files parsed with metrics',
    type: CreateParsedTextResponseDto,
    isArray: true,
  })
  @ApiBadRequestResponse({ description: 'Files are missing or invalid' })
  parseFiles(
    @Body() body: ParseFileDto,
    @UploadedFiles() files?: { buffer: Buffer; originalname?: string }[],
  ): Promise<CreateParsedTextResponseDto[]> {
    return this.textParserService.createFromFiles(
      body.title,
      files,
      body.fileType,
      body.preprocess,
    );
  }
}
