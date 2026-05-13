import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDesComplexCipher1778800000000 implements MigrationInterface {
  name = 'AddDesComplexCipher1778800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."complex_cipher_jobs_algorithm_enum" ADD VALUE IF NOT EXISTS 'des'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "complex_cipher_jobs" ALTER COLUMN "algorithm" TYPE text USING "algorithm"::text`,
    );
    await queryRunner.query(
      `DELETE FROM "complex_cipher_jobs" WHERE "algorithm" = 'des'`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."complex_cipher_jobs_algorithm_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."complex_cipher_jobs_algorithm_enum" AS ENUM('aes')`,
    );
    await queryRunner.query(
      `ALTER TABLE "complex_cipher_jobs" ALTER COLUMN "algorithm" TYPE "public"."complex_cipher_jobs_algorithm_enum" USING "algorithm"::"public"."complex_cipher_jobs_algorithm_enum"`,
    );
  }
}
