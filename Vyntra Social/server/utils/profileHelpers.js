import { randomUUID } from 'crypto';

import { httpError } from './http.js';
import { requireSupabase, supabaseAdmin } from './supabaseClient.js';
import { normalizeUsername } from './validators.js';

function slugUsername(value) {
  const base = String(value || 'vyntra_user')
    .replace(/^@/, '')
    .replace(/[^A-Za-z0-9_]/g, '')
    .slice(0, 24)
    .toLowerCase();

  return base.length >= 3 ? base : `user_${base || 'vyntra'}`;
}

export async function createUniqueUsername(seed) {
  requireSupabase();

  const base = slugUsername(seed);

  for (let index = 0; index < 20; index += 1) {
    const candidate = index === 0 ? base : `${base.slice(0, 24)}_${index}`;
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('username', candidate)
      .maybeSingle();

    if (error) throw httpError(500, 'Could not check username availability.', error.message);
    if (!data) return candidate;
  }

  return `${base.slice(0, 18)}_${randomUUID().slice(0, 8)}`;
}

export async function ensureProfileForUser(user) {
  requireSupabase();

  const { data: existing, error: readError } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (readError) throw httpError(500, 'Could not load profile.', readError.message);
  if (existing) return existing;

  const metadata = user.user_metadata || {};
  const emailName = user.email ? user.email.split('@')[0] : 'vyntra_user';
  const username = await createUniqueUsername(metadata.username || metadata.preferred_username || emailName);
  const fullName = metadata.full_name || metadata.name || emailName || 'Vyntra User';

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .insert({
      id: user.id,
      full_name: fullName,
      username,
      profile_image_url: metadata.avatar_url || null,
      bio: ''
    })
    .select('*')
    .single();

  if (error) throw httpError(500, 'Could not create profile.', error.message);
  return data;
}

export async function usernameIsAvailable(username, ownerId) {
  requireSupabase();
  const normalized = normalizeUsername(username);
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('username', normalized)
    .maybeSingle();

  if (error) throw httpError(500, 'Could not check username availability.', error.message);
  return !data || data.id === ownerId;
}

export async function getProfileCounts(profileId) {
  requireSupabase();

  const [followers, following, posts] = await Promise.all([
    supabaseAdmin.from('followers').select('id', { count: 'exact', head: true }).eq('following_id', profileId),
    supabaseAdmin.from('followers').select('id', { count: 'exact', head: true }).eq('follower_id', profileId),
    supabaseAdmin.from('posts').select('id', { count: 'exact', head: true }).eq('user_id', profileId)
  ]);

  for (const result of [followers, following, posts]) {
    if (result.error) throw httpError(500, 'Could not load profile counts.', result.error.message);
  }

  return {
    followers: followers.count || 0,
    following: following.count || 0,
    posts: posts.count || 0
  };
}

export async function decorateProfile(profile, viewerId) {
  if (!profile) return null;

  const counts = await getProfileCounts(profile.id);
  let isFollowing = false;

  if (viewerId && viewerId !== profile.id) {
    const { data, error } = await supabaseAdmin
      .from('followers')
      .select('id')
      .eq('follower_id', viewerId)
      .eq('following_id', profile.id)
      .maybeSingle();

    if (error) throw httpError(500, 'Could not load follow state.', error.message);
    isFollowing = Boolean(data);
  }

  return {
    ...profile,
    counts,
    viewer: {
      isOwner: viewerId === profile.id,
      isFollowing
    }
  };
}
