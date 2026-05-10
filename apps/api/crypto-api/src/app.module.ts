import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ConfigModule } from '@nestjs/config';
import { AppService } from './app.service';
import { DatabaseModule } from './modules/database/database.module';
import { ExperimentsModule } from './modules/experiments/experiments.module';
import { TextParserModule } from './modules/text-parser/text-parser.module';
import { ClassicalCiphersModule } from './modules/classical-ciphers/classical-ciphers.module';
import { ComplexCiphersModule } from './modules/complex-ciphers/complex-ciphers.module';

@Module({
  imports: [
    DatabaseModule,
    ConfigModule.forRoot({ isGlobal: true }),
    ExperimentsModule,
    TextParserModule,
    ClassicalCiphersModule,
    ComplexCiphersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
