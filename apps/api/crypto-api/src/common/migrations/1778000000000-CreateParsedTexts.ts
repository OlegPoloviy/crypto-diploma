import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateParsedTexts1778000000000 implements MigrationInterface {
  name = 'CreateParsedTexts1778000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."parsed_texts_source_enum" AS ENUM('manual', 'upload')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."parsed_texts_status_enum" AS ENUM('queued', 'processing', 'completed', 'failed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "parsed_texts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying(150) NOT NULL, "source" "public"."parsed_texts_source_enum" NOT NULL, "originalFileName" character varying, "status" "public"."parsed_texts_status_enum" NOT NULL DEFAULT 'queued', "words" jsonb, "totalWords" integer NOT NULL DEFAULT '0', "totalChars" integer NOT NULL DEFAULT '0', "uniqueWords" integer NOT NULL DEFAULT '0', "errorMessage" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_1ec983a78c904c8234d2ee863d9" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "parsed_texts"`);
    await queryRunner.query(`DROP TYPE "public"."parsed_texts_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."parsed_texts_source_enum"`);
  }
}
