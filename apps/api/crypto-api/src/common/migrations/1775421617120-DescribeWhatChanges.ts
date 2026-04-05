import { MigrationInterface, QueryRunner } from "typeorm";

export class DescribeWhatChanges1775421617120 implements MigrationInterface {
    name = 'DescribeWhatChanges1775421617120'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."experiments_algorithm_enum" AS ENUM('aes')`);
        await queryRunner.query(`CREATE TYPE "public"."experiments_mode_enum" AS ENUM('ecb', 'cbc', 'ctr')`);
        await queryRunner.query(`CREATE TYPE "public"."experiments_status_enum" AS ENUM('created', 'queued', 'processing', 'completed', 'failed')`);
        await queryRunner.query(`CREATE TABLE "experiments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying NOT NULL, "inputText" text NOT NULL, "algorithm" "public"."experiments_algorithm_enum" NOT NULL DEFAULT 'aes', "mode" "public"."experiments_mode_enum" NOT NULL DEFAULT 'cbc', "whiteningEnabled" boolean NOT NULL DEFAULT false, "status" "public"."experiments_status_enum" NOT NULL DEFAULT 'created', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_aafe1321d916fac58ba06ad8178" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "experiments"`);
        await queryRunner.query(`DROP TYPE "public"."experiments_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."experiments_mode_enum"`);
        await queryRunner.query(`DROP TYPE "public"."experiments_algorithm_enum"`);
    }

}
