import { asyncHandler, httpError } from '../utils/http.js';
import { requireSupabase, supabaseAdmin } from '../utils/supabaseClient.js';

async function countReposts(postId) {
  const { count, error } = await supabaseAdmin
    .from('reposts')
    .select('id', { count: 'exact', head: true })
    .eq('post_id', postId);

  if (error) throw httpError(500, 'Could not count reposts.', error.message);
  return count || 0;
}

export const createRepost = asyncHandler(async (req, res) => {
  requireSupabase();

  const { error } = await supabaseAdmin
    .from('reposts')
    .upsert(
      { post_id: req.params.postId, user_id: req.user.id },
      { onConflict: 'post_id,user_id', ignoreDuplicates: true }
    );

  if (error) throw httpError(400, error.message);
  res.status(201).json({ message: 'Repost created', reposted: true, count: await countReposts(req.params.postId) });
});

export const removeRepost = asyncHandler(async (req, res) => {
  requireSupabase();

  const { error } = await supabaseAdmin
    .from('reposts')
    .delete()
    .eq('post_id', req.params.postId)
    .eq('user_id', req.user.id);

  if (error) throw httpError(400, error.message);
  res.json({ message: 'Repost removed', reposted: false, count: await countReposts(req.params.postId) });
});
