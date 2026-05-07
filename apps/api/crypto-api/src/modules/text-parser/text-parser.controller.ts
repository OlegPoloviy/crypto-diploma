import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { CreateParsedTextResponseDto } from './dto/create-parsed-text-response.dto';
import { ParseTextDto } from './dto/parse-text.dto';
import { TextParserService } from './text-parser.service';

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
    return this.textParserService.createFromFile(body.title, file);
  }
}
