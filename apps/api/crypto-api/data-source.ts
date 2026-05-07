import { DataSource } from 'typeorm';
import 'dotenv/config';

const databaseUrl = process.env.DATABASE_URL;
const sslEnabled = process.env.DATABASE_SSL === 'true';
const shared = {
  type: 'postgres' as const,
  entities: ['src/**/*.entity{.ts,.js}'],
  migrations: ['src/common/migrations/*{.ts,.js}'],
  synchronize: false,
  ssl: sslEnabled ? { rejectUnauthorized: false } : false,
};

export const AppDataSource = new DataSource({
  ...shared,
  ...(databaseUrl
    ? { url: databaseUrl }
    : {
        host: process.env.DATABASE_HOST,
        port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
        username: process.env.DATABASE_USER,
        password: process.env.DATABASE_PASSWORD,
        database: process.env.DATABASE_NAME,
      }),
});
