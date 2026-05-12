import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddParsedTextContent1778700000000 implements MigrationInterface {
  name = 'AddParsedTextContent1778700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."parsed_texts_contentencoding_enum" AS ENUM('utf8', 'hex')`,
    );
    await queryRunner.query(`ALTER TABLE "parsed_texts" ADD "content" text`);
    await queryRunner.query(
      `ALTER TABLE "parsed_texts" ADD "contentEncoding" "public"."parsed_texts_contentencoding_enum" NOT NULL DEFAULT 'utf8'`,
    );
    await queryRunner.query(
      `UPDATE "parsed_texts" SET "content" = array_to_string(ARRAY(SELECT jsonb_array_elements_text("words")), ' ') WHERE "words" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "parsed_texts" DROP COLUMN "contentEncoding"`,
    );
    await queryRunner.query(`ALTER TABLE "parsed_texts" DROP COLUMN "content"`);
    await queryRunner.query(
      `DROP TYPE "public"."parsed_texts_contentencoding_enum"`,
    );
  }
}
