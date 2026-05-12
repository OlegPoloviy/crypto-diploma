import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClassicalCipherMetricStats1778300000000 implements MigrationInterface {
  name = 'AddClassicalCipherMetricStats1778300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "classical_cipher_jobs" ADD "metricStats" jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "classical_cipher_jobs" DROP COLUMN "metricStats"`,
    );
  }
}
