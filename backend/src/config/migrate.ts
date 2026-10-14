import { sql } from './database.js';

async function migrate() {
  try {
    console.log('Adding phone_number column to users table...');
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20)`;
    
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
    
    console.log('Creating SOS declines table...');
    await sql`
      CREATE TABLE IF NOT EXISTS sos_declines (
        id SERIAL PRIMARY KEY,
        sos_request_id INTEGER NOT NULL REFERENCES sos_requests(id) ON DELETE CASCADE,
        volunteer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        declined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(sos_request_id, volunteer_id)
      )
    `;
    
    console.log('Creating index on sos_declines table...');
    await sql`
      CREATE INDEX IF NOT EXISTS idx_sos_declines_volunteer_id
      ON sos_declines(volunteer_id)
    `;
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_sos_declines_sos_request_id
      ON sos_declines(sos_request_id)
    `;
    
    console.log('Adding evacuation_status column to sos_requests table...');
    await sql`ALTER TABLE sos_requests ADD COLUMN IF NOT EXISTS evacuation_status VARCHAR(50) DEFAULT 'pending'`;
    
    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
