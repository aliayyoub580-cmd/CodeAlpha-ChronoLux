import { httpError } from './http.js';
import { requireSupabase, supabaseAdmin } from './supabaseClient.js';

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

async function fetchRows(table, column, ids) {
  if (!ids.length) return [];
  const { data, error } = await supabaseAdmin.from(table).select(column).in(column, ids);
  if (error) throw httpError(500, `Could not load ${table}.`, error.message);
  return data || [];
}

async function countByPost(table, postIds) {
  const rows = await fetchRows(table, 'post_id', postIds);
  return rows.reduce((counts, row) => {
    counts[row.post_id] = (counts[row.post_id] || 0) + 1;
    return counts;
  }, {});
}

export async function enrichPosts(posts, viewerId) {
  requireSupabase();
  if (!posts?.length) return [];

  const postIds = posts.map((post) => post.id);
  const authorIds = uniqueValues(posts.map((post) => post.user_id));

  const [
    profilesResult,
    likeCounts,
    commentCounts,
    shareCounts,
    repostCounts,
    viewerLikesResult,
    viewerRepostsResult,
    viewerFollowsResult
  ] = await Promise.all([
    supabaseAdmin.from('profiles').select('*').in('id', authorIds),
    countByPost('likes', postIds),
    countByPost('comments', postIds),
    countByPost('shares', postIds),
    countByPost('reposts', postIds),
    viewerId
      ? supabaseAdmin.from('likes').select('post_id').eq('user_id', viewerId).in('post_id', postIds)
      : Promise.resolve({ data: [], error: null }),
    viewerId
      ? supabaseAdmin.from('reposts').select('post_id').eq('user_id', viewerId).in('post_id', postIds)
      : Promise.resolve({ data: [], error: null }),
    viewerId
      ? supabaseAdmin.from('followers').select('following_id').eq('follower_id', viewerId).in('following_id', authorIds)
      : Promise.resolve({ data: [], error: null })
  ]);

  for (const result of [profilesResult, viewerLikesResult, viewerRepostsResult, viewerFollowsResult]) {
    if (result.error) throw httpError(500, 'Could not load post details.', result.error.message);
  }

  const profiles = new Map((profilesResult.data || []).map((profile) => [profile.id, profile]));
  const liked = new Set((viewerLikesResult.data || []).map((row) => row.post_id));
  const reposted = new Set((viewerRepostsResult.data || []).map((row) => row.post_id));
  const following = new Set((viewerFollowsResult.data || []).map((row) => row.following_id));

  return posts.map((post) => ({
    ...post,
    author: profiles.get(post.user_id) || null,
    counts: {
      likes: likeCounts[post.id] || 0,
      comments: commentCounts[post.id] || 0,
      shares: shareCounts[post.id] || 0,
      reposts: repostCounts[post.id] || 0
    },
    viewer: {
      isOwner: viewerId === post.user_id,
      liked: liked.has(post.id),
      reposted: reposted.has(post.id),
      followingAuthor: following.has(post.user_id)
    }
  }));
}
