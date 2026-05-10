import { httpError } from '../utils/http.js';
import { requireSupabase, supabaseAuth } from '../utils/supabaseClient.js';

async function attachSupabaseUser(req, required) {
  requireSupabase({ serviceRole: false });

  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';

  if (!token) {
    if (required) throw httpError(401, 'Authentication is required.');
    return;
  }

  const { data, error } = await supabaseAuth.auth.getUser(token);

  if (error || !data?.user) {
    if (required) throw httpError(401, 'Your session is invalid or expired.');
    return;
  }

  req.user = data.user;
  req.accessToken = token;
}

export async function requireAuth(req, res, next) {
  try {
    await attachSupabaseUser(req, true);
    next();
  } catch (error) {
    next(error);
  }
}

export async function optionalAuth(req, res, next) {
  try {
    await attachSupabaseUser(req, false);
    next();
  } catch (error) {
    next(error);
  }
}
