import { asyncHandler, httpError } from '../utils/http.js';
import { requireSupabase, supabaseAdmin } from '../utils/supabaseClient.js';
import { requiredString } from '../utils/validators.js';

async function decorateComments(comments) {
  const userIds = [...new Set((comments || []).map((comment) => comment.user_id))];
  if (!userIds.length) return [];

  const { data, error } = await supabaseAdmin.from('profiles').select('*').in('id', userIds);
  if (error) throw httpError(500, 'Could not load comment authors.', error.message);

  const profiles = new Map((data || []).map((profile) => [profile.id, profile]));
  return comments.map((comment) => ({
    ...comment,
    author: profiles.get(comment.user_id) || null
  }));
}

async function countComments(postId) {
  const { count, error } = await supabaseAdmin
    .from('comments')
    .select('id', { count: 'exact', head: true })
    .eq('post_id', postId);

  if (error) throw httpError(500, 'Could not count comments.', error.message);
  return count || 0;
}

export const getComments = asyncHandler(async (req, res) => {
  requireSupabase();

  const { data, error } = await supabaseAdmin
    .from('comments')
    .select('*')
    .eq('post_id', req.params.postId)
    .order('created_at', { ascending: true });

  if (error) throw httpError(500, 'Could not load comments.', error.message);
  res.json({ comments: await decorateComments(data || []) });
});

export const addComment = asyncHandler(async (req, res) => {
  requireSupabase();

  const commentText = requiredString(req.body.comment_text || req.body.commentText, 'Comment text', 1000);
  const { data, error } = await supabaseAdmin
    .from('comments')
    .insert({
      post_id: req.params.postId,
      user_id: req.user.id,
      comment_text: commentText
    })
    .select('*')
    .single();

  if (error) throw httpError(400, error.message);

  const [comment] = await decorateComments([data]);
  res.status(201).json({
    message: 'Comment added',
    comment,
    count: await countComments(req.params.postId)
  });
});

export const deleteComment = asyncHandler(async (req, res) => {
  requireSupabase();

  const { data: comment, error: readError } = await supabaseAdmin
    .from('comments')
    .select('*')
    .eq('id', req.params.id)
    .maybeSingle();

  if (readError) throw httpError(500, 'Could not load comment.', readError.message);
  if (!comment) throw httpError(404, 'Comment not found.');
  if (comment.user_id !== req.user.id) throw httpError(403, 'You can only delete your own comments.');

  const { error } = await supabaseAdmin.from('comments').delete().eq('id', req.params.id);
  if (error) throw httpError(400, error.message);

  res.json({
    message: 'Comment deleted',
    postId: comment.post_id,
    count: await countComments(comment.post_id)
  });
});
