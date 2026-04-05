import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ExperimentsEntity } from './experiments.entity';
import { CreateExperimentDto } from './dto/create-experiment.dto';
import { CreateExperimentResponseDto } from './dto/create-experiment-response.dto';
import { ExperimentResponseDto } from './dto/experiment-response.dto';
import { Repository } from 'typeorm';

@Injectable()
export class ExperimentsService {
  constructor(
    @InjectRepository(ExperimentsEntity)
    private readonly experimentsRepo: Repository<ExperimentsEntity>,
  ) {}
  async createExperiment(
    dto: CreateExperimentDto,
  ): Promise<CreateExperimentResponseDto> {
    const experiment = this.experimentsRepo.create(dto);
    if (!experiment) {
      throw new InternalServerErrorException('Failed to create new experiment');
    }
    await this.experimentsRepo.save(experiment);
    return { created: true };
  }

  async findAll(): Promise<ExperimentResponseDto[]> {
    const rows = await this.experimentsRepo.find({
      order: { createdAt: 'DESC' },
    });
    return rows.map((e) => this.toResponse(e));
  }

  async findOne(id: string): Promise<ExperimentResponseDto> {
    const experiment = await this.experimentsRepo.findOne({ where: { id } });
    if (!experiment) {
      throw new NotFoundException(`Experiment ${id} not found`);
    }
    return this.toResponse(experiment);
  }

  private toResponse(e: ExperimentsEntity): ExperimentResponseDto {
    return {
      id: e.id,
      title: e.title,
      inputText: e.inputText,
      algorithm: e.algorithm,
      mode: e.mode,
      whiteningEnabled: e.whiteningEnabled,
      status: e.status,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    };
  }
}
