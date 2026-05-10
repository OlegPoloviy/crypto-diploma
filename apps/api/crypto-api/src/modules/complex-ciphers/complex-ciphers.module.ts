import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParsedTextEntity } from '../text-parser/parsed-text.entity';
import { ComplexCipherJobEntity } from './complex-cipher-job.entity';
import { ComplexCiphersController } from './complex-ciphers.controller';
import { ComplexCiphersService } from './complex-ciphers.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ParsedTextEntity, ComplexCipherJobEntity]),
  ],
  controllers: [ComplexCiphersController],
  providers: [ComplexCiphersService],
})
export class ComplexCiphersModule {}
