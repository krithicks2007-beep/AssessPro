import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

export const ALLOWED_DOMAIN = (process.env.ALLOWED_DOMAIN || 'bitsathy.ac.in').toLowerCase().trim();
export const SUPER_ADMIN_EMAIL = (process.env.SUPER_ADMIN_EMAIL || 'krithickrajs.cs25@bitsathy.ac.in').toLowerCase().trim();
