import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

function getPostgresClient() {
  if (process.env.SQL_HOST) {
    return postgres({
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      prepare: false,
      connect_timeout: 10,
    });
  }

  const connectionString = process.env.DATABASE_URL || '';
  return postgres(connectionString, { 
    prepare: false,
    connect_timeout: 5,
  });
}

const client = getPostgresClient();
export const db = drizzle(client, { schema });
export { schema };

