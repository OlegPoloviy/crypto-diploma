import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
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
  ApiTags,
} from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { CreateParsedTextResponseDto } from './dto/create-parsed-text-response.dto';
import { ParseTextDto } from './dto/parse-text.dto';
import { TextFileType, TextParserService } from './text-parser.service';

class ParseFileDto {
  @ApiProperty({
    example: 'Moby Dick',
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
    description: 'Declared text file type. Binary support will be added later.',
  })
  @IsEnum(TextFileType)
  @IsOptional()
  fileType?: TextFileType;
}

@ApiTags('text-parser')
@Controller('text-parser')
export class TextParserController {
  constructor(private readonly textParserService: TextParserService) {}

  @Get()
  @ApiOperation({ summary: 'List parsed text jobs' })
  @ApiOkResponse({
    description: 'Parsed texts ordered by newest first',
    type: CreateParsedTextResponseDto,
    isArray: true,
  })
  findAll(): Promise<CreateParsedTextResponseDto[]> {
    return this.textParserService.findAll();
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
  @ApiOperation({ summary: 'Queue raw text parsing' })
  @ApiCreatedResponse({
    description: 'Text parsing job queued',
    type: CreateParsedTextResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  parseText(@Body() body: ParseTextDto): Promise<CreateParsedTextResponseDto> {
    return this.textParserService.createFromText(
      body.title,
      body.text,
      body.originalFileName,
    );
  }

  @Post('file')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload and queue a .txt file parsing' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          example: 'Moby Dick',
        },
        file: {
          type: 'string',
          format: 'binary',
          description: 'Project Gutenberg .txt file',
        },
      },
      required: ['title', 'file'],
    },
  })
  @ApiCreatedResponse({
    description: 'File parsing job queued',
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
    );
  }

  @Post('files')
  @UseInterceptors(FilesInterceptor('files'))
  @ApiOperation({ summary: 'Upload and queue multiple text files for parsing' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          example: 'Gutenberg batch',
        },
        fileType: {
          type: 'string',
          enum: Object.values(TextFileType),
          default: TextFileType.PLAIN_TEXT,
          description:
            'Declared text file type. Binary support will be added later.',
        },
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
      required: ['title', 'files'],
    },
  })
  @ApiCreatedResponse({
    description: 'File parsing jobs queued',
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
    );
  }
}
