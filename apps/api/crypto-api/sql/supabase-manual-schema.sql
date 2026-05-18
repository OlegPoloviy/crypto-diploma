-- Manual Supabase schema patch for crypto-api.
-- Run this in Supabase SQL Editor when Render/TypeORM migrations are not available.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'experiments_algorithm_enum') THEN
    CREATE TYPE "public"."experiments_algorithm_enum" AS ENUM ('aes');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'experiments_mode_enum') THEN
    CREATE TYPE "public"."experiments_mode_enum" AS ENUM ('ecb', 'cbc', 'ctr');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'experiments_status_enum') THEN
    CREATE TYPE "public"."experiments_status_enum" AS ENUM ('created', 'queued', 'processing', 'completed', 'failed');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'parsed_texts_source_enum') THEN
    CREATE TYPE "public"."parsed_texts_source_enum" AS ENUM ('manual', 'upload');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'parsed_texts_status_enum') THEN
    CREATE TYPE "public"."parsed_texts_status_enum" AS ENUM ('queued', 'processing', 'completed', 'failed');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'parsed_texts_contentencoding_enum') THEN
    CREATE TYPE "public"."parsed_texts_contentencoding_enum" AS ENUM ('utf8', 'hex');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'parsed_texts_corpuskind_enum') THEN
    CREATE TYPE "public"."parsed_texts_corpuskind_enum" AS ENUM ('natural_text', 'random_bytes');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'classical_cipher_jobs_algorithm_enum') THEN
    CREATE TYPE "public"."classical_cipher_jobs_algorithm_enum" AS ENUM ('caesar', 'vigenere_key_symbols', 'vigenere_key_lengths');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'classical_cipher_jobs_status_enum') THEN
    CREATE TYPE "public"."classical_cipher_jobs_status_enum" AS ENUM ('queued', 'processing', 'completed', 'failed');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'complex_cipher_jobs_algorithm_enum') THEN
    CREATE TYPE "public"."complex_cipher_jobs_algorithm_enum" AS ENUM ('aes');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'complex_cipher_jobs_status_enum') THEN
    CREATE TYPE "public"."complex_cipher_jobs_status_enum" AS ENUM ('queued', 'processing', 'completed', 'failed');
  END IF;
END $$;

ALTER TYPE "public"."parsed_texts_source_enum" ADD VALUE IF NOT EXISTS 'generated';
ALTER TYPE "public"."complex_cipher_jobs_algorithm_enum" ADD VALUE IF NOT EXISTS 'des';
ALTER TYPE "public"."complex_cipher_jobs_algorithm_enum" ADD VALUE IF NOT EXISTS 'kalyna';

CREATE TABLE IF NOT EXISTS "experiments" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "title" character varying NOT NULL,
  "inputText" text NOT NULL,
  "algorithm" "public"."experiments_algorithm_enum" NOT NULL DEFAULT 'aes',
  "mode" "public"."experiments_mode_enum" NOT NULL DEFAULT 'cbc',
  "whiteningEnabled" boolean NOT NULL DEFAULT false,
  "status" "public"."experiments_status_enum" NOT NULL DEFAULT 'created',
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "PK_aafe1321d916fac58ba06ad8178" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "parsed_texts" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "title" character varying(150) NOT NULL,
  "source" "public"."parsed_texts_source_enum" NOT NULL,
  "originalFileName" character varying,
  "status" "public"."parsed_texts_status_enum" NOT NULL DEFAULT 'queued',
  "words" jsonb,
  "totalWords" integer NOT NULL DEFAULT 0,
  "totalChars" integer NOT NULL DEFAULT 0,
  "uniqueWords" integer NOT NULL DEFAULT 0,
  "errorMessage" text,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "PK_1ec983a78c904c8234d2ee863d9" PRIMARY KEY ("id")
);

ALTER TABLE "parsed_texts" ADD COLUMN IF NOT EXISTS "hurstExponent" double precision;
ALTER TABLE "parsed_texts" ADD COLUMN IF NOT EXISTS "dfaAlpha" double precision;
ALTER TABLE "parsed_texts" ADD COLUMN IF NOT EXISTS "deaDelta" double precision;
ALTER TABLE "parsed_texts" ADD COLUMN IF NOT EXISTS "wordFrequencyEntropy" double precision;
ALTER TABLE "parsed_texts" ADD COLUMN IF NOT EXISTS "content" text;
ALTER TABLE "parsed_texts" ADD COLUMN IF NOT EXISTS "contentEncoding" "public"."parsed_texts_contentencoding_enum" NOT NULL DEFAULT 'utf8';
ALTER TABLE "parsed_texts" ADD COLUMN IF NOT EXISTS "corpusKind" "public"."parsed_texts_corpuskind_enum" NOT NULL DEFAULT 'natural_text';
ALTER TABLE "parsed_texts" ADD COLUMN IF NOT EXISTS "baselineSetId" uuid;

UPDATE "parsed_texts"
SET "content" = array_to_string(ARRAY(SELECT jsonb_array_elements_text("words")), ' ')
WHERE "content" IS NULL AND "words" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "IDX_parsed_texts_baseline_set" ON "parsed_texts" ("baselineSetId");

CREATE TABLE IF NOT EXISTS "classical_cipher_jobs" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "parsedTextId" uuid NOT NULL,
  "algorithm" "public"."classical_cipher_jobs_algorithm_enum" NOT NULL,
  "parameters" jsonb NOT NULL,
  "status" "public"."classical_cipher_jobs_status_enum" NOT NULL DEFAULT 'queued',
  "finalText" text,
  "steps" jsonb,
  "errorMessage" text,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "PK_f6c098364cdb6df56085f5723a5" PRIMARY KEY ("id")
);

ALTER TABLE "classical_cipher_jobs" ADD COLUMN IF NOT EXISTS "metricStats" jsonb;
ALTER TABLE "classical_cipher_jobs" ADD COLUMN IF NOT EXISTS "progressPercent" double precision NOT NULL DEFAULT 0;
ALTER TABLE "classical_cipher_jobs" ADD COLUMN IF NOT EXISTS "progressProcessed" integer NOT NULL DEFAULT 0;
ALTER TABLE "classical_cipher_jobs" ADD COLUMN IF NOT EXISTS "progressTotal" integer NOT NULL DEFAULT 0;
ALTER TABLE "classical_cipher_jobs" ADD COLUMN IF NOT EXISTS "progressMessage" text;

CREATE TABLE IF NOT EXISTS "complex_cipher_jobs" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "parsedTextId" uuid NOT NULL,
  "algorithm" "public"."complex_cipher_jobs_algorithm_enum" NOT NULL,
  "parameters" jsonb NOT NULL,
  "status" "public"."complex_cipher_jobs_status_enum" NOT NULL DEFAULT 'queued',
  "finalText" text,
  "metadata" jsonb,
  "errorMessage" text,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "PK_complex_cipher_jobs" PRIMARY KEY ("id")
);

ALTER TABLE "complex_cipher_jobs" ADD COLUMN IF NOT EXISTS "steps" jsonb;
ALTER TABLE "complex_cipher_jobs" ADD COLUMN IF NOT EXISTS "metricStats" jsonb;
ALTER TABLE "complex_cipher_jobs" ADD COLUMN IF NOT EXISTS "progressPercent" double precision NOT NULL DEFAULT 0;
ALTER TABLE "complex_cipher_jobs" ADD COLUMN IF NOT EXISTS "progressProcessed" integer NOT NULL DEFAULT 0;
ALTER TABLE "complex_cipher_jobs" ADD COLUMN IF NOT EXISTS "progressTotal" integer NOT NULL DEFAULT 0;
ALTER TABLE "complex_cipher_jobs" ADD COLUMN IF NOT EXISTS "progressMessage" text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'FK_classical_cipher_jobs_parsed_text'
  ) THEN
    ALTER TABLE "classical_cipher_jobs"
      ADD CONSTRAINT "FK_classical_cipher_jobs_parsed_text"
      FOREIGN KEY ("parsedTextId") REFERENCES "parsed_texts"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'FK_complex_cipher_jobs_parsed_text'
  ) THEN
    ALTER TABLE "complex_cipher_jobs"
      ADD CONSTRAINT "FK_complex_cipher_jobs_parsed_text"
      FOREIGN KEY ("parsedTextId") REFERENCES "parsed_texts"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "migrations" (
  "id" SERIAL NOT NULL,
  "timestamp" bigint NOT NULL,
  "name" character varying NOT NULL,
  CONSTRAINT "PK_8c82d7f526340ab734260ea46be" PRIMARY KEY ("id")
);

INSERT INTO "migrations" ("timestamp", "name")
SELECT migration_timestamp, migration_name
FROM (
  VALUES
    (1775421617120::bigint, 'DescribeWhatChanges1775421617120'),
    (1778000000000::bigint, 'CreateParsedTexts1778000000000'),
    (1778100000000::bigint, 'CreateClassicalCipherJobs1778100000000'),
    (1778200000000::bigint, 'AddParsedTextMetrics1778200000000'),
    (1778300000000::bigint, 'AddClassicalCipherMetricStats1778300000000'),
    (1778400000000::bigint, 'CreateComplexCipherJobs1778400000000'),
    (1778500000000::bigint, 'AddComplexCipherMetricStats1778500000000'),
    (1778600000000::bigint, 'AddComplexCipherSteps1778600000000'),
    (1778700000000::bigint, 'AddParsedTextContent1778700000000'),
    (1778800000000::bigint, 'AddDesComplexCipher1778800000000'),
    (1778800000000::bigint, 'AddParsedTextCorpusKind1778800000000'),
    (1778900000000::bigint, 'AddKalynaComplexCipher1778900000000'),
    (1779000000000::bigint, 'AddDeaMetric1779000000000'),
    (1779100000000::bigint, 'AddCipherJobProgress1779100000000')
) AS applied(migration_timestamp, migration_name)
WHERE NOT EXISTS (
  SELECT 1 FROM "migrations" m WHERE m."name" = applied.migration_name
);
