import { asyncHandler, httpError } from '../utils/http.js';
import { enrichPosts } from '../utils/postHelpers.js';
import { env, requireSupabase, supabaseAdmin } from '../utils/supabaseClient.js';
import { uploadPublicFile } from '../utils/storage.js';
import { optionalImageUrl, optionalString, requiredString, validateImageFile, validatePdfFile } from '../utils/validators.js';

function getPostFiles(req) {
  return {
    image: req.files?.image?.[0] || null,
    pdf: req.files?.pdf?.[0] || null
  };
}

async function getOwnedPost(postId, userId) {
  const { data, error } = await supabaseAdmin.from('posts').select('*').eq('id', postId).maybeSingle();
  if (error) throw httpError(500, 'Could not load post.', error.message);
  if (!data) throw httpError(404, 'Post not found.');
  if (data.user_id !== userId) throw httpError(403, 'You can only change your own posts.');
  return data;
}

export const getPosts = asyncHandler(async (req, res) => {
  requireSupabase();

  const limit = Math.min(Number(req.query.limit || 20), 50);
  const offset = Math.max(Number(req.query.offset || 0), 0);
  const { data, error } = await supabaseAdmin
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw httpError(500, 'Could not load feed.', error.message);
  res.json({ posts: await enrichPosts(data || [], req.user?.id) });
});

export const getSinglePost = asyncHandler(async (req, res) => {
  requireSupabase();
  const { data, error } = await supabaseAdmin.from('posts').select('*').eq('id', req.params.id).maybeSingle();
  if (error) throw httpError(500, 'Could not load post.', error.message);
  if (!data) throw httpError(404, 'Post not found.');

  const [post] = await enrichPosts([data], req.user?.id);
  res.json({ post });
});

export const getUserPosts = asyncHandler(async (req, res) => {
  requireSupabase();
  const { data, error } = await supabaseAdmin
    .from('posts')
    .select('*')
    .eq('user_id', req.params.userId)
    .order('created_at', { ascending: false });

  if (error) throw httpError(500, 'Could not load user posts.', error.message);
  res.json({ posts: await enrichPosts(data || [], req.user?.id) });
});

export const createPost = asyncHandler(async (req, res) => {
  requireSupabase();

  const title = requiredString(
    Array.isArray(req.body.title) ? req.body.title[0] : req.body.title,
    'Post title',
    140
  );
  const description = requiredString(
    Array.isArray(req.body.description) ? req.body.description[0] : req.body.description,
    'Post description',
    5000
  );
  const imageUrlValue = req.body.image_url || req.body.imageUrl;
  const pastedImageUrl = optionalImageUrl(
    Array.isArray(imageUrlValue) ? imageUrlValue[0] : imageUrlValue
  );
  const { image, pdf } = getPostFiles(req);

  if (image && pastedImageUrl) {
    throw httpError(400, 'Choose either an uploaded image or an image URL, not both.');
  }

  validateImageFile(image, 5 * 1024 * 1024, 'Post image');
  validatePdfFile(pdf, 10 * 1024 * 1024);

  const [imageUrl, pdfUrl] = await Promise.all([
    image
      ? uploadPublicFile({ bucket: env.buckets.postImages, userId: req.user.id, file: image, prefix: 'post-image' })
      : Promise.resolve(pastedImageUrl),
    pdf
      ? uploadPublicFile({ bucket: env.buckets.postPdfs, userId: req.user.id, file: pdf, prefix: 'post-pdf' })
      : Promise.resolve(null)
  ]);

  const { data, error } = await supabaseAdmin
    .from('posts')
    .insert({
      user_id: req.user.id,
      title,
      description,
      image_url: imageUrl,
      pdf_url: pdfUrl
    })
    .select('*')
    .single();

  if (error) throw httpError(400, error.message);
  const [post] = await enrichPosts([data], req.user.id);
  res.status(201).json({ message: 'Post created successfully', post });
});

export const updatePost = asyncHandler(async (req, res) => {
  requireSupabase();
  await getOwnedPost(req.params.id, req.user.id);

  const title = optionalString(req.body.title, 140);
  const description = optionalString(req.body.description, 5000);
  const updates = {};
  if (title) updates.title = title;
  if (description) updates.description = description;
  if (!Object.keys(updates).length) throw httpError(400, 'No post updates were provided.');

  const { data, error } = await supabaseAdmin
    .from('posts')
    .update(updates)
    .eq('id', req.params.id)
    .select('*')
    .single();

  if (error) throw httpError(400, error.message);
  const [post] = await enrichPosts([data], req.user.id);
  res.json({ message: 'Post updated successfully', post });
});

export const deletePost = asyncHandler(async (req, res) => {
  requireSupabase();
  await getOwnedPost(req.params.id, req.user.id);

  const { error } = await supabaseAdmin.from('posts').delete().eq('id', req.params.id);
  if (error) throw httpError(400, error.message);

  res.json({ message: 'Post deleted successfully' });
});
