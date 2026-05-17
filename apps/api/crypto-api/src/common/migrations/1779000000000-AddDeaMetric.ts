import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeaMetric1779000000000 implements MigrationInterface {
  name = 'AddDeaMetric1779000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "parsed_texts" ADD "deaDelta" double precision`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "parsed_texts" DROP COLUMN "deaDelta"`);
  }
}
