import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ParsedTextSource {
  MANUAL = 'manual',
  UPLOAD = 'upload',
  GENERATED = 'generated',
}

export enum ParsedTextCorpusKind {
  NATURAL_TEXT = 'natural_text',
  RANDOM_BYTES = 'random_bytes',
}

export enum ParsedTextStatus {
  QUEUED = 'queued',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum ParsedTextContentEncoding {
  UTF8 = 'utf8',
  HEX = 'hex',
}

@Entity('parsed_texts')
@Index('IDX_parsed_texts_baseline_set', ['baselineSetId'])
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

  @Column({
    type: 'enum',
    enum: ParsedTextCorpusKind,
    default: ParsedTextCorpusKind.NATURAL_TEXT,
  })
  corpusKind: ParsedTextCorpusKind;

  @Column({ type: 'uuid', nullable: true })
  baselineSetId?: string | null;

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

  @Column({ type: 'text', nullable: true })
  content?: string | null;

  @Column({
    type: 'enum',
    enum: ParsedTextContentEncoding,
    default: ParsedTextContentEncoding.UTF8,
  })
  contentEncoding: ParsedTextContentEncoding;

  @Column({ default: 0 })
  totalWords: number;

  @Column({ default: 0 })
  totalChars: number;

  @Column({ default: 0 })
  uniqueWords: number;

  @Column({ type: 'double precision', nullable: true })
  hurstExponent?: number | null;

  @Column({ type: 'double precision', nullable: true })
  dfaAlpha?: number | null;

  @Column({ type: 'double precision', nullable: true })
  deaDelta?: number | null;

  @Column({ type: 'double precision', nullable: true })
  wordFrequencyEntropy?: number | null;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
