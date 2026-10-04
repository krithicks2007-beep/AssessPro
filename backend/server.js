import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { supabase, ALLOWED_DOMAIN } from './src/config/db.js';

import authRoutes from './src/routes/authRoutes.js';
import profileRoutes from './src/routes/profileRoutes.js';
import staffProfileRoutes from './src/routes/staffProfileRoutes.js';
import groupRoutes from './src/routes/groupRoutes.js';
import testRoutes from './src/routes/testRoutes.js';
import adminRoutes from './src/routes/adminRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:5173')
  .split(',').map(origin => origin.trim()).filter(Boolean);

// Always allow Vercel prod origin
allowedOrigins.push('https://assess-pro-peach.vercel.app');

app.use(cors({
  origin: allowedOrigins.length > 0 ? allowedOrigins : '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());

// 1. HEALTH CHECK ENDPOINT
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'AssessPro Backend API',
    port: PORT,
    allowedDomain: ALLOWED_DOMAIN,
    databaseConnected: Boolean(supabase)
  });
});

// MOUNT ROUTES
app.use(authRoutes);
app.use(profileRoutes);
app.use(staffProfileRoutes);
app.use(groupRoutes);
app.use(testRoutes);
app.use(adminRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔗 Allowed domain: ${ALLOWED_DOMAIN}`);
  if (!supabase) {
    console.warn('⚠️  Supabase is not configured! Authentication will fail.');
  }
});
