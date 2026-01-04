import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { promisify } from 'util';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, '../../portfolio.db');

const db = new sqlite3.Database(dbPath);

// Promisify database methods
db.runAsync = promisify(db.run.bind(db));
db.getAsync = promisify(db.get.bind(db));
db.allAsync = promisify(db.all.bind(db));

// Read and execute schema
const schemaPath = join(__dirname, '../models/schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');

// Execute each SQL statement
const statements = schema.split(';').filter(s => s.trim());
for (const stmt of statements) {
  await db.runAsync(stmt);
}

console.log('✅ Database initialized:', dbPath);

export default db;
