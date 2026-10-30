import { registerAs } from '@nestjs/config';

const envValue = (...names: string[]): string | undefined => {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }

  return undefined;
};

export const databaseConfig = registerAs('database', () => ({
  host: envValue('DB_HOST') ?? 'localhost',
  port: Number(envValue('DB_PORT') ?? 3306),
  username: envValue('DB_USERNAME', 'MYSQL_USER'),
  password: envValue('DB_PASSWORD', 'MYSQL_PASSWORD'),
  database: envValue('DB_DATABASE', 'MYSQL_DATABASE'),
}));
