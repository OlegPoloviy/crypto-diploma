import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddComplexCipherMetricStats1778500000000 implements MigrationInterface {
  name = 'AddComplexCipherMetricStats1778500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "complex_cipher_jobs" ADD "metricStats" jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "complex_cipher_jobs" DROP COLUMN "metricStats"`,
    );
  }
}
