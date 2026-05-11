import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddComplexCipherSteps1778600000000 implements MigrationInterface {
  name = 'AddComplexCipherSteps1778600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "complex_cipher_jobs" ADD "steps" jsonb`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "complex_cipher_jobs" DROP COLUMN "steps"`,
    );
  }
}
