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
  ApiOperation,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ComplexCiphersService } from './complex-ciphers.service';
import { CreateAesCipherJobDto } from './dto/create-complex-cipher-job.dto';
import { AesDecryptDto, AesEncryptDto } from './dto/aes-cipher.dto';
import { AesResponseDto } from './dto/aes-response.dto';
import { ComplexCipherJobResponseDto } from './dto/complex-cipher-job-response.dto';

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
}
