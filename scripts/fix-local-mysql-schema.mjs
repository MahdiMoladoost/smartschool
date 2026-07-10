import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { runCompatibilityMigrations } from '../src/data/schemaRunner.js';

dotenv.config();

const DB_NAME = process.env.DB_NAME || 'smart_school';
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: DB_NAME,
  charset: 'utf8mb4'
};

const conn = await mysql.createConnection(config);
try {
  console.log('🔧 Running local MySQL compatibility fix...');
  await runCompatibilityMigrations(conn);
  console.log('✅ Local MySQL compatibility fix completed.');
} finally {
  await conn.end();
}
