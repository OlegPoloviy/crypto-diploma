import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ExperimentStatus } from '../../../../../../shared/types/experiment.status';
import { AlgorithmType } from '../../../../../../shared/types/algorith.types';

export enum CipherMode {
  ECB = 'ecb',
  CBC = 'cbc',
  CTR = 'ctr',
}

@Entity('experiments')
export class ExperimentsEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  inputText: string;

  @Column({
    type: 'enum',
    enum: AlgorithmType,
    default: AlgorithmType.AES,
  })
  algorithm: AlgorithmType;

  @Column({
    type: 'enum',
    enum: CipherMode,
    default: CipherMode.CBC,
  })
  mode: CipherMode;

  @Column({ default: false })
  whiteningEnabled: boolean;

  @Column({
    type: 'enum',
    enum: ExperimentStatus,
    default: ExperimentStatus.CREATED,
  })
  status: ExperimentStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
