import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
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
}
