import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddKalynaComplexCipher1778900000000 implements MigrationInterface {
  name = 'AddKalynaComplexCipher1778900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."complex_cipher_jobs_algorithm_enum" ADD VALUE IF NOT EXISTS 'kalyna'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "complex_cipher_jobs" ALTER COLUMN "algorithm" TYPE text USING "algorithm"::text`,
    );
    await queryRunner.query(
      `DELETE FROM "complex_cipher_jobs" WHERE "algorithm" = 'kalyna'`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."complex_cipher_jobs_algorithm_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."complex_cipher_jobs_algorithm_enum" AS ENUM('aes', 'des')`,
    );
    await queryRunner.query(
      `ALTER TABLE "complex_cipher_jobs" ALTER COLUMN "algorithm" TYPE "public"."complex_cipher_jobs_algorithm_enum" USING "algorithm"::"public"."complex_cipher_jobs_algorithm_enum"`,
    );
  }
}
