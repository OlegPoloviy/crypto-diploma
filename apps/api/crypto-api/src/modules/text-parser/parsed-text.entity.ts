import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ParsedTextSource {
  MANUAL = 'manual',
  UPLOAD = 'upload',
}

export enum ParsedTextStatus {
  QUEUED = 'queued',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('parsed_texts')
export class ParsedTextEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 150 })
  title: string;

  @Column({
    type: 'enum',
    enum: ParsedTextSource,
  })
  source: ParsedTextSource;

  @Column({ nullable: true })
  originalFileName?: string;

  @Column({
    type: 'enum',
    enum: ParsedTextStatus,
    default: ParsedTextStatus.QUEUED,
  })
  status: ParsedTextStatus;

  @Column({ type: 'jsonb', nullable: true })
  words?: string[];

  @Column({ default: 0 })
  totalWords: number;

  @Column({ default: 0 })
  totalChars: number;

  @Column({ default: 0 })
  uniqueWords: number;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
