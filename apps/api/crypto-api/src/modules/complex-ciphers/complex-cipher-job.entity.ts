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
  ComplexCipherAlgorithm,
  ComplexCipherJobStatus,
  ComplexCipherParameters,
} from './complex-ciphers.types';
import { CipherMetricStatDto } from '../classical-ciphers/dto/cipher-metric-stat.dto';

@Entity('complex_cipher_jobs')
export class ComplexCipherJobEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  parsedTextId: string;

  @ManyToOne(() => ParsedTextEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parsedTextId' })
  parsedText: ParsedTextEntity;

  @Column({
    type: 'enum',
    enum: ComplexCipherAlgorithm,
  })
  algorithm: ComplexCipherAlgorithm;

  @Column({ type: 'jsonb' })
  parameters: ComplexCipherParameters;

  @Column({
    type: 'enum',
    enum: ComplexCipherJobStatus,
    default: ComplexCipherJobStatus.QUEUED,
  })
  status: ComplexCipherJobStatus;

  @Column({ type: 'text', nullable: true })
  finalText?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  metricStats?: CipherMetricStatDto[] | null;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
