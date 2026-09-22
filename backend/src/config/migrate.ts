import { sql } from './database.js';

async function migrate() {
  try {
    console.log('Adding volunteer columns to users table...');
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_volunteer BOOLEAN DEFAULT FALSE`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS volunteer_area_latitude DECIMAL(10, 7)`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS volunteer_area_longitude DECIMAL(10, 7)`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_volunteering_active BOOLEAN DEFAULT FALSE`;
    
    console.log('Creating SOS requests table...');
    await sql`
      CREATE TABLE IF NOT EXISTS sos_requests (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        latitude DECIMAL(10, 7) NOT NULL,
        longitude DECIMAL(10, 7) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        volunteer_id INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
