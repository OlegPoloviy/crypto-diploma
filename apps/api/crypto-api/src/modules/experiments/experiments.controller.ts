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
import { ExperimentsService } from './experiments.service';
import { CreateExperimentDto } from './dto/create-experiment.dto';
import { CreateExperimentResponseDto } from './dto/create-experiment-response.dto';
import { ExperimentResponseDto } from './dto/experiment-response.dto';

@ApiTags('experiments')
@Controller('experiments')
export class ExperimentsController {
  constructor(private readonly experimentService: ExperimentsService) {}

  @Get()
  @ApiOperation({ summary: 'List all experiments' })
  @ApiOkResponse({
    description: 'Experiments ordered by newest first',
    type: ExperimentResponseDto,
    isArray: true,
  })
  findAll(): Promise<ExperimentResponseDto[]> {
    return this.experimentService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get experiment by id' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Experiment id' })
  @ApiOkResponse({ type: ExperimentResponseDto })
  @ApiNotFoundResponse({ description: 'Experiment not found' })
  findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<ExperimentResponseDto> {
    return this.experimentService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new crypto experiment' })
  @ApiCreatedResponse({
    description: 'Experiment created and stored',
    type: CreateExperimentResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  async createExperiment(
    @Body() body: CreateExperimentDto,
  ): Promise<CreateExperimentResponseDto> {
    return this.experimentService.createExperiment(body);
  }
}
