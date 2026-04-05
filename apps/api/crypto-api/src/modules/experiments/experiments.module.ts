import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExperimentsEntity } from './experiments.entity';
import { ExperimentsService } from './experiments.service';
import { ExperimentsController } from './experiments.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ExperimentsEntity])],
  providers: [ExperimentsService],
  controllers: [ExperimentsController],
})
export class ExperimentsModule {}
