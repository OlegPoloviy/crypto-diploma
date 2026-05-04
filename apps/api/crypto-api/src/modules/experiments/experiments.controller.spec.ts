import { Test, TestingModule } from '@nestjs/testing';
import { ExperimentsController } from './experiments.controller';
import { ExperimentsService } from './experiments.service';

describe('ExperimentsController', () => {
  let controller: ExperimentsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExperimentsController],
      providers: [
        {
          provide: ExperimentsService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            createExperiment: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ExperimentsController>(ExperimentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
