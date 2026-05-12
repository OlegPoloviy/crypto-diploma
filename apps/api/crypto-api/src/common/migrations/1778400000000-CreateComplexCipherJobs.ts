import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateComplexCipherJobs1778400000000 implements MigrationInterface {
  name = 'CreateComplexCipherJobs1778400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."complex_cipher_jobs_algorithm_enum" AS ENUM('aes')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."complex_cipher_jobs_status_enum" AS ENUM('queued', 'processing', 'completed', 'failed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "complex_cipher_jobs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "parsedTextId" uuid NOT NULL, "algorithm" "public"."complex_cipher_jobs_algorithm_enum" NOT NULL, "parameters" jsonb NOT NULL, "status" "public"."complex_cipher_jobs_status_enum" NOT NULL DEFAULT 'queued', "finalText" text, "metadata" jsonb, "errorMessage" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_complex_cipher_jobs" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "complex_cipher_jobs" ADD CONSTRAINT "FK_complex_cipher_jobs_parsed_text" FOREIGN KEY ("parsedTextId") REFERENCES "parsed_texts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "complex_cipher_jobs" DROP CONSTRAINT "FK_complex_cipher_jobs_parsed_text"`,
    );
    await queryRunner.query(`DROP TABLE "complex_cipher_jobs"`);
    await queryRunner.query(
      `DROP TYPE "public"."complex_cipher_jobs_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."complex_cipher_jobs_algorithm_enum"`,
    );
  }
}
