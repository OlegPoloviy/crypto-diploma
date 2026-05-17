import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddParsedTextCorpusKind1778800000000 implements MigrationInterface {
  name = 'AddParsedTextCorpusKind1778800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."parsed_texts_source_enum" ADD VALUE IF NOT EXISTS 'generated'`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."parsed_texts_corpuskind_enum" AS ENUM('natural_text', 'random_bytes')`,
    );
    await queryRunner.query(
      `ALTER TABLE "parsed_texts" ADD "corpusKind" "public"."parsed_texts_corpuskind_enum" NOT NULL DEFAULT 'natural_text'`,
    );
    await queryRunner.query(
      `ALTER TABLE "parsed_texts" ADD "baselineSetId" uuid`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_parsed_texts_baseline_set" ON "parsed_texts" ("baselineSetId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_parsed_texts_baseline_set"`,
    );
    await queryRunner.query(
      `ALTER TABLE "parsed_texts" DROP COLUMN "baselineSetId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "parsed_texts" DROP COLUMN "corpusKind"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."parsed_texts_corpuskind_enum"`,
    );
  }
}
