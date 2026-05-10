import { asyncHandler, httpError } from '../utils/http.js';
import { requireSupabase, supabaseAdmin } from '../utils/supabaseClient.js';

async function countShares(postId) {
  const { count, error } = await supabaseAdmin
    .from('shares')
    .select('id', { count: 'exact', head: true })
    .eq('post_id', postId);

  if (error) throw httpError(500, 'Could not count shares.', error.message);
  return count || 0;
}

export const sharePost = asyncHandler(async (req, res) => {
  requireSupabase();

  const { error } = await supabaseAdmin.from('shares').insert({
    post_id: req.params.postId,
    user_id: req.user.id
  });

  if (error) throw httpError(400, error.message);
  res.status(201).json({ message: 'Post link copied', count: await countShares(req.params.postId) });
});
