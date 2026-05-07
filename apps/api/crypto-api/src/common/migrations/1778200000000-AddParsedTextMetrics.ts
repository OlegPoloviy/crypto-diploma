import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddParsedTextMetrics1778200000000 implements MigrationInterface {
  name = 'AddParsedTextMetrics1778200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "parsed_texts" ADD "hurstExponent" double precision`,
    );
    await queryRunner.query(
      `ALTER TABLE "parsed_texts" ADD "dfaAlpha" double precision`,
    );
    await queryRunner.query(
      `ALTER TABLE "parsed_texts" ADD "wordFrequencyEntropy" double precision`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "parsed_texts" DROP COLUMN "wordFrequencyEntropy"`,
    );
    await queryRunner.query(
      `ALTER TABLE "parsed_texts" DROP COLUMN "dfaAlpha"`,
    );
    await queryRunner.query(
      `ALTER TABLE "parsed_texts" DROP COLUMN "hurstExponent"`,
    );
  }
}
