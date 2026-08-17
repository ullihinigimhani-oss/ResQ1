import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { sql } from './config/database.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Basic API test
app.get('/', (_req, res) => {
  res.json({
    message: 'ResQ1 Backend API is running'
  });
});

// Neon database connection test
app.get('/api/health', async (_req, res) => {
  try {
    const result = await sql`
      SELECT NOW() AS current_time
    `;

    res.status(200).json({
      success: true,
      message: 'ResQ1 Backend connected to Neon PostgreSQL successfully',
      databaseTime: result[0]?.current_time
    });
  } catch (error) {
    console.error('Database connection error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to connect to Neon PostgreSQL'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`ResQ1 Backend API running on http://localhost:${PORT}`);
});