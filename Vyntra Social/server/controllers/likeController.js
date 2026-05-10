import { asyncHandler, httpError } from '../utils/http.js';
import { requireSupabase, supabaseAdmin } from '../utils/supabaseClient.js';

async function countLikes(postId) {
  const { count, error } = await supabaseAdmin
    .from('likes')
    .select('id', { count: 'exact', head: true })
    .eq('post_id', postId);

  if (error) throw httpError(500, 'Could not count likes.', error.message);
  return count || 0;
}

export const likePost = asyncHandler(async (req, res) => {
  requireSupabase();

  const { error } = await supabaseAdmin
    .from('likes')
    .upsert(
      { post_id: req.params.postId, user_id: req.user.id },
      { onConflict: 'post_id,user_id', ignoreDuplicates: true }
    );

  if (error) throw httpError(400, error.message);
  res.status(201).json({ message: 'Post liked', liked: true, count: await countLikes(req.params.postId) });
});

export const unlikePost = asyncHandler(async (req, res) => {
  requireSupabase();

  const { error } = await supabaseAdmin
    .from('likes')
    .delete()
    .eq('post_id', req.params.postId)
    .eq('user_id', req.user.id);

  if (error) throw httpError(400, error.message);
  res.json({ message: 'Post unliked', liked: false, count: await countLikes(req.params.postId) });
});
