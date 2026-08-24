import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { sql } from './config/database.js';
import alertRoutes from './routes/alertRoutes.js';
import authRoutes from './routes/authRoutes.js';
import communityNotificationRoutes from './routes/communityNotificationRoutes.js';
import familyMemberRoutes from './routes/familyMemberRoutes.js';
import incidentRoutes from './routes/incidentRoutes.js';
import shelterRoutes from './routes/shelterRoutes.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 5000);
const HOST = process.env.HOST || '0.0.0.0';

// Middleware
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/community-notifications', communityNotificationRoutes);
app.use('/api/family-members', familyMemberRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/shelters', shelterRoutes);

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
app.listen(PORT, HOST, () => {
  console.log(`ResQ1 Backend API running on http://${HOST}:${PORT}`);
});
