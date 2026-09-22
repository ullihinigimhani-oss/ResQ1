import { sql } from './database.js';

async function migrate() {
  try {
    console.log('Adding is_volunteer column to users table...');
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_volunteer BOOLEAN DEFAULT FALSE`;
    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
