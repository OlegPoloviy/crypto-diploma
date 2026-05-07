import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateClassicalCipherJobs1778100000000 implements MigrationInterface {
  name = 'CreateClassicalCipherJobs1778100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."classical_cipher_jobs_algorithm_enum" AS ENUM('caesar', 'vigenere_key_symbols', 'vigenere_key_lengths')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."classical_cipher_jobs_status_enum" AS ENUM('queued', 'processing', 'completed', 'failed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "classical_cipher_jobs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "parsedTextId" uuid NOT NULL, "algorithm" "public"."classical_cipher_jobs_algorithm_enum" NOT NULL, "parameters" jsonb NOT NULL, "status" "public"."classical_cipher_jobs_status_enum" NOT NULL DEFAULT 'queued', "finalText" text, "steps" jsonb, "errorMessage" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f6c098364cdb6df56085f5723a5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "classical_cipher_jobs" ADD CONSTRAINT "FK_classical_cipher_jobs_parsed_text" FOREIGN KEY ("parsedTextId") REFERENCES "parsed_texts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "classical_cipher_jobs" DROP CONSTRAINT "FK_classical_cipher_jobs_parsed_text"`,
    );
    await queryRunner.query(`DROP TABLE "classical_cipher_jobs"`);
    await queryRunner.query(
      `DROP TYPE "public"."classical_cipher_jobs_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."classical_cipher_jobs_algorithm_enum"`,
    );
  }
}
