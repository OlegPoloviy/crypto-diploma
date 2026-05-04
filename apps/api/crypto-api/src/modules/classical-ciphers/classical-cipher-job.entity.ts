import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ParsedTextEntity } from '../text-parser/parsed-text.entity';
import {
  ClassicalCipherAlgorithm,
  ClassicalCipherJobStatus,
  ClassicalCipherParameters,
} from './classical-ciphers.types';
import { CipherStepResponseDto } from './dto/cipher-step-response.dto';

@Entity('classical_cipher_jobs')
export class ClassicalCipherJobEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  parsedTextId: string;

  @ManyToOne(() => ParsedTextEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parsedTextId' })
  parsedText: ParsedTextEntity;

  @Column({
    type: 'enum',
    enum: ClassicalCipherAlgorithm,
  })
  algorithm: ClassicalCipherAlgorithm;

  @Column({ type: 'jsonb' })
  parameters: ClassicalCipherParameters;

  @Column({
    type: 'enum',
    enum: ClassicalCipherJobStatus,
    default: ClassicalCipherJobStatus.QUEUED,
  })
  status: ClassicalCipherJobStatus;

  @Column({ type: 'text', nullable: true })
  finalText?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  steps?: CipherStepResponseDto[] | null;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
