import { asyncHandler, httpError } from '../utils/http.js';
import { decorateProfile, usernameIsAvailable } from '../utils/profileHelpers.js';
import { env, requireSupabase, supabaseAdmin } from '../utils/supabaseClient.js';
import { uploadPublicFile } from '../utils/storage.js';
import { normalizeUsername, optionalString, requiredString, validateImageFile } from '../utils/validators.js';

async function fetchProfileBy(column, value) {
  requireSupabase();
  const { data, error } = await supabaseAdmin.from('profiles').select('*').eq(column, value).maybeSingle();
  if (error) throw httpError(500, 'Could not load profile.', error.message);
  if (!data) throw httpError(404, 'Profile not found.');
  return data;
}

export const listProfiles = asyncHandler(async (req, res) => {
  requireSupabase();

  const limit = Math.min(Number(req.query.limit || 8), 24);
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  let query = supabaseAdmin
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,username.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) throw httpError(500, 'Could not load profiles.', error.message);

  const decorated = await Promise.all((data || []).map((profile) => decorateProfile(profile, req.user?.id)));
  res.json({ profiles: decorated });
});

export const getProfileById = asyncHandler(async (req, res) => {
  const profile = await fetchProfileBy('id', req.params.id);
  res.json({ profile: await decorateProfile(profile, req.user?.id) });
});

export const getProfileByUsername = asyncHandler(async (req, res) => {
  const username = normalizeUsername(req.params.username);
  const profile = await fetchProfileBy('username', username);
  res.json({ profile: await decorateProfile(profile, req.user?.id) });
});

export const updateProfile = asyncHandler(async (req, res) => {
  requireSupabase();

  if (req.params.id !== req.user.id) {
    throw httpError(403, 'You can only edit your own profile.');
  }

  const fullName = requiredString(req.body.full_name || req.body.fullName, 'Full name', 120);
  const username = normalizeUsername(req.body.username);
  const bio = optionalString(req.body.bio, 240) || '';

  const available = await usernameIsAvailable(username, req.user.id);
  if (!available) throw httpError(409, 'Username is already taken.');

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update({ full_name: fullName, username, bio })
    .eq('id', req.user.id)
    .select('*')
    .single();

  if (error) throw httpError(400, error.message);
  res.json({ message: 'Profile updated successfully', profile: await decorateProfile(data, req.user.id) });
});

export const uploadProfileImage = asyncHandler(async (req, res) => {
  if (req.params.id !== req.user.id) throw httpError(403, 'You can only update your own profile image.');
  if (!req.file) throw httpError(400, 'Profile image is required.');

  validateImageFile(req.file, 2 * 1024 * 1024, 'Profile image');
  const url = await uploadPublicFile({
    bucket: env.buckets.profileImages,
    userId: req.user.id,
    file: req.file,
    prefix: 'profile'
  });

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update({ profile_image_url: url })
    .eq('id', req.user.id)
    .select('*')
    .single();

  if (error) throw httpError(400, error.message);
  res.json({ message: 'Profile image updated successfully', profile: await decorateProfile(data, req.user.id) });
});

export const uploadCoverImage = asyncHandler(async (req, res) => {
  if (req.params.id !== req.user.id) throw httpError(403, 'You can only update your own cover image.');
  if (!req.file) throw httpError(400, 'Cover image is required.');

  validateImageFile(req.file, 5 * 1024 * 1024, 'Cover image');
  const url = await uploadPublicFile({
    bucket: env.buckets.coverImages,
    userId: req.user.id,
    file: req.file,
    prefix: 'cover'
  });

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update({ cover_image_url: url })
    .eq('id', req.user.id)
    .select('*')
    .single();

  if (error) throw httpError(400, error.message);
  res.json({ message: 'Cover image updated successfully', profile: await decorateProfile(data, req.user.id) });
});
