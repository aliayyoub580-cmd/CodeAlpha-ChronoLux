import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(rootDir, '.env') });
dotenv.config({ path: path.join(rootDir, '.env.local'), override: true });

const env = {
  url: process.env.SUPABASE_URL,
  serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  buckets: [
    {
      id: process.env.SUPABASE_BUCKET_PROFILE_IMAGES || 'profile-images',
      public: true,
      fileSizeLimit: 2 * 1024 * 1024,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
    },
    {
      id: process.env.SUPABASE_BUCKET_COVER_IMAGES || 'cover-images',
      public: true,
      fileSizeLimit: 5 * 1024 * 1024,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
    },
    {
      id: process.env.SUPABASE_BUCKET_POST_IMAGES || 'post-images',
      public: true,
      fileSizeLimit: 5 * 1024 * 1024,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
    },
    {
      id: process.env.SUPABASE_BUCKET_POST_PDFS || 'post-pdfs',
      public: true,
      fileSizeLimit: 10 * 1024 * 1024,
      allowedMimeTypes: ['application/pdf']
    }
  ]
};

const tableChecks = {
  profiles: 'id,full_name,username,bio,profile_image_url,cover_image_url,created_at,updated_at',
  posts: 'id,user_id,title,description,image_url,pdf_url,created_at,updated_at',
  comments: 'id,post_id,user_id,comment_text,created_at',
  likes: 'id,post_id,user_id,created_at',
  followers: 'id,follower_id,following_id,created_at',
  shares: 'id,post_id,user_id,created_at',
  reposts: 'id,post_id,user_id,created_at'
};

function requireEnv() {
  const missing = [];
  if (!env.url) missing.push('SUPABASE_URL');
  if (!env.serviceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (missing.length) {
    throw new Error(`Missing required env values: ${missing.join(', ')}`);
  }
}

async function readSqlHint() {
  const schemaPath = path.join(rootDir, 'supabase', 'schema.sql');
  const storagePath = path.join(rootDir, 'supabase', 'storage.sql');
  const [schema, storage] = await Promise.all([fs.readFile(schemaPath, 'utf8'), fs.readFile(storagePath, 'utf8')]);

  return [
    'Database SQL is ready in:',
    `- ${schemaPath} (${schema.split('\n').length} lines)`,
    `- ${storagePath} (${storage.split('\n').length} lines)`,
    '',
    'Run those files once in the Supabase SQL editor to create tables, triggers, RLS policies, and storage policies.'
  ].join('\n');
}

async function ensureBucket(client, bucket) {
  const { data: buckets, error: listError } = await client.storage.listBuckets();
  if (listError) throw new Error(`Could not list buckets: ${listError.message}`);

  const exists = buckets.some((item) => item.id === bucket.id || item.name === bucket.id);
  const options = {
    public: bucket.public,
    fileSizeLimit: bucket.fileSizeLimit,
    allowedMimeTypes: bucket.allowedMimeTypes
  };

  if (exists) {
    const { error } = await client.storage.updateBucket(bucket.id, options);
    if (error) throw new Error(`Could not update bucket "${bucket.id}": ${error.message}`);
    console.log(`Updated bucket: ${bucket.id}`);
    return;
  }

  const { error } = await client.storage.createBucket(bucket.id, options);
  if (error) throw new Error(`Could not create bucket "${bucket.id}": ${error.message}`);
  console.log(`Created bucket: ${bucket.id}`);
}

async function verifyTables(client) {
  const missing = [];

  for (const [table, columns] of Object.entries(tableChecks)) {
    const { error } = await client.from(table).select(columns).limit(1);
    if (error) {
      missing.push(`${table}: ${error.message}`);
    } else {
      console.log(`Verified table: ${table}`);
    }
  }

  return missing;
}

async function main() {
  requireEnv();

  const client = createClient(env.url, env.serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const { data, error } = await client.auth.admin.listUsers({ page: 1, perPage: 1 });
  if (error) throw new Error(`Supabase credentials failed: ${error.message}`);
  console.log(`Connected to Supabase. Users visible to service role: ${data.users.length}`);

  for (const bucket of env.buckets) {
    await ensureBucket(client, bucket);
  }

  const missingTables = await verifyTables(client);

  console.log('');
  console.log(await readSqlHint());

  if (missingTables.length) {
    console.log('');
    console.log('Tables still missing or not visible through PostgREST:');
    for (const item of missingTables) console.log(`- ${item}`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
