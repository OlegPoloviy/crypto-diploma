import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParsedTextEntity } from '../text-parser/parsed-text.entity';
import { ClassicalCipherJobEntity } from './classical-cipher-job.entity';
import { ClassicalCiphersController } from './classical-ciphers.controller';
import { ClassicalCiphersService } from './classical-ciphers.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ParsedTextEntity, ClassicalCipherJobEntity]),
  ],
  controllers: [ClassicalCiphersController],
  providers: [ClassicalCiphersService],
})
export class ClassicalCiphersModule {}
