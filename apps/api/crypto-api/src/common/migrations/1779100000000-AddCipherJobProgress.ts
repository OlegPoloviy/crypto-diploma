import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCipherJobProgress1779100000000 implements MigrationInterface {
  name = 'AddCipherJobProgress1779100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.addProgressColumns(queryRunner, 'classical_cipher_jobs');
    await this.addProgressColumns(queryRunner, 'complex_cipher_jobs');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.dropProgressColumns(queryRunner, 'complex_cipher_jobs');
    await this.dropProgressColumns(queryRunner, 'classical_cipher_jobs');
  }

  private async addProgressColumns(
    queryRunner: QueryRunner,
    table: string,
  ): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "${table}" ADD "progressPercent" double precision NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "${table}" ADD "progressProcessed" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "${table}" ADD "progressTotal" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "${table}" ADD "progressMessage" text`,
    );
  }

  private async dropProgressColumns(
    queryRunner: QueryRunner,
    table: string,
  ): Promise<void> {
    await queryRunner.query(`ALTER TABLE "${table}" DROP COLUMN "progressMessage"`);
    await queryRunner.query(`ALTER TABLE "${table}" DROP COLUMN "progressTotal"`);
    await queryRunner.query(
      `ALTER TABLE "${table}" DROP COLUMN "progressProcessed"`,
    );
    await queryRunner.query(`ALTER TABLE "${table}" DROP COLUMN "progressPercent"`);
  }
}
