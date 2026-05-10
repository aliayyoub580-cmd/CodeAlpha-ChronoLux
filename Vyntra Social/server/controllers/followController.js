import { asyncHandler, httpError } from '../utils/http.js';
import { decorateProfile } from '../utils/profileHelpers.js';
import { requireSupabase, supabaseAdmin } from '../utils/supabaseClient.js';

async function countFollowers(userId) {
  const { count, error } = await supabaseAdmin
    .from('followers')
    .select('id', { count: 'exact', head: true })
    .eq('following_id', userId);

  if (error) throw httpError(500, 'Could not count followers.', error.message);
  return count || 0;
}

async function profileExists(userId) {
  const { data, error } = await supabaseAdmin.from('profiles').select('id').eq('id', userId).maybeSingle();
  if (error) throw httpError(500, 'Could not load user.', error.message);
  return Boolean(data);
}

async function loadFollowProfiles(column, profileColumn, userId, viewerId) {
  const { data, error } = await supabaseAdmin.from('followers').select(profileColumn).eq(column, userId);
  if (error) throw httpError(500, 'Could not load follows.', error.message);

  const ids = (data || []).map((row) => row[profileColumn]);
  if (!ids.length) return [];

  const { data: profiles, error: profilesError } = await supabaseAdmin.from('profiles').select('*').in('id', ids);
  if (profilesError) throw httpError(500, 'Could not load profiles.', profilesError.message);

  return Promise.all((profiles || []).map((profile) => decorateProfile(profile, viewerId)));
}

export const followUser = asyncHandler(async (req, res) => {
  requireSupabase();

  const targetId = req.params.userId;
  if (targetId === req.user.id) throw httpError(400, 'You cannot follow yourself.');
  if (!(await profileExists(targetId))) throw httpError(404, 'User not found.');

  const { error } = await supabaseAdmin
    .from('followers')
    .upsert(
      { follower_id: req.user.id, following_id: targetId },
      { onConflict: 'follower_id,following_id', ignoreDuplicates: true }
    );

  if (error) throw httpError(400, error.message);
  res.status(201).json({ message: 'User followed', following: true, count: await countFollowers(targetId) });
});

export const unfollowUser = asyncHandler(async (req, res) => {
  requireSupabase();

  const targetId = req.params.userId;
  const { error } = await supabaseAdmin
    .from('followers')
    .delete()
    .eq('follower_id', req.user.id)
    .eq('following_id', targetId);

  if (error) throw httpError(400, error.message);
  res.json({ message: 'User unfollowed', following: false, count: await countFollowers(targetId) });
});

export const getFollowers = asyncHandler(async (req, res) => {
  requireSupabase();
  res.json({ profiles: await loadFollowProfiles('following_id', 'follower_id', req.params.userId, req.user?.id) });
});

export const getFollowing = asyncHandler(async (req, res) => {
  requireSupabase();
  res.json({ profiles: await loadFollowProfiles('follower_id', 'following_id', req.params.userId, req.user?.id) });
});
