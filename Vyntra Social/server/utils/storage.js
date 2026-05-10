import { randomUUID } from 'crypto';

import { httpError } from './http.js';
import { requireSupabase, supabaseAdmin } from './supabaseClient.js';

function extensionFromFile(file) {
  const original = file.originalname || 'upload';
  const extension = original.includes('.') ? original.split('.').pop().toLowerCase() : '';
  return extension.replace(/[^a-z0-9]/g, '') || 'bin';
}

export async function uploadPublicFile({ bucket, userId, file, prefix = 'file' }) {
  requireSupabase();

  if (!file) return null;

  const extension = extensionFromFile(file);
  const safePrefix = prefix.replace(/[^a-z0-9_-]/gi, '').toLowerCase() || 'file';
  const path = `${userId}/${safePrefix}-${Date.now()}-${randomUUID()}.${extension}`;

  const { error } = await supabaseAdmin.storage.from(bucket).upload(path, file.buffer, {
    contentType: file.mimetype,
    upsert: false
  });

  if (error) {
    throw httpError(500, 'Upload failed.', error.message);
  }

  const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
