import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ConfigModule } from '@nestjs/config';
import { AppService } from './app.service';
import { DatabaseModule } from './modules/database/database.module';
import { ExperimentsModule } from './modules/experiments/experiments.module';

@Module({
  imports: [DatabaseModule, ConfigModule.forRoot({ isGlobal: true }), ExperimentsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
