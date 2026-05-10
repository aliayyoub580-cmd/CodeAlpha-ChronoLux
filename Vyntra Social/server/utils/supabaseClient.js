import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..');

dotenv.config({ path: path.join(rootDir, '.env') });
dotenv.config({ path: path.join(rootDir, '.env.local'), override: true });

export const env = {
  port: process.env.PORT || '3000',
  appUrl: process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`,
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  buckets: {
    profileImages: process.env.SUPABASE_BUCKET_PROFILE_IMAGES || 'profile-images',
    coverImages: process.env.SUPABASE_BUCKET_COVER_IMAGES || 'cover-images',
    postImages: process.env.SUPABASE_BUCKET_POST_IMAGES || 'post-images',
    postPdfs: process.env.SUPABASE_BUCKET_POST_PDFS || 'post-pdfs'
  }
};

const hasUrl = Boolean(env.supabaseUrl);
const hasAnonKey = Boolean(env.supabaseAnonKey);
const hasServiceKey = Boolean(env.supabaseServiceRoleKey);

export const supabaseAuth =
  hasUrl && hasAnonKey
    ? createClient(env.supabaseUrl, env.supabaseAnonKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      })
    : null;

export const supabaseAdmin =
  hasUrl && hasServiceKey
    ? createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      })
    : null;

export function getConfigStatus() {
  return {
    hasSupabaseUrl: hasUrl,
    hasAnonKey,
    hasServiceRoleKey: hasServiceKey,
    ready: hasUrl && hasAnonKey && hasServiceKey
  };
}

export function requireSupabase({ serviceRole = true } = {}) {
  if (!supabaseAuth || (serviceRole && !supabaseAdmin)) {
    const missing = [];
    if (!hasUrl) missing.push('SUPABASE_URL');
    if (!hasAnonKey) missing.push('SUPABASE_ANON_KEY');
    if (serviceRole && !hasServiceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
    const error = new Error(`Supabase is not configured. Missing: ${missing.join(', ')}`);
    error.status = 503;
    throw error;
  }
}
