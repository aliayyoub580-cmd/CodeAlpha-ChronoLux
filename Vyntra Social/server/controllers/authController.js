import { asyncHandler, httpError } from '../utils/http.js';
import { ensureProfileForUser, usernameIsAvailable } from '../utils/profileHelpers.js';
import { env, getConfigStatus, requireSupabase, supabaseAuth, supabaseAdmin } from '../utils/supabaseClient.js';
import { normalizeUsername, requiredExactString, requiredString, validateEmail, validatePassword } from '../utils/validators.js';

export const getPublicConfig = asyncHandler(async (req, res) => {
  res.json({
    appName: 'Vyntra Social',
    tagline: 'Connect. Share. Grow.',
    supabaseUrl: env.supabaseUrl,
    supabaseAnonKey: env.supabaseAnonKey,
    status: getConfigStatus()
  });
});

export const registerUser = asyncHandler(async (req, res) => {
  requireSupabase();

  const fullName = requiredString(req.body.full_name || req.body.fullName, 'Full name', 120);
  const username = normalizeUsername(req.body.username);
  const email = validateEmail(req.body.email);
  validatePassword(req.body.password, req.body.confirm_password || req.body.confirmPassword);

  const available = await usernameIsAvailable(username);
  if (!available) throw httpError(409, 'Username is already taken.');

  const { data, error } = await supabaseAuth.auth.signUp({
    email,
    password: req.body.password,
    options: {
      data: {
        full_name: fullName,
        username
      }
    }
  });

  if (error) throw httpError(400, error.message);
  if (!data?.user) throw httpError(500, 'Could not create account.');

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .upsert(
      {
        id: data.user.id,
        full_name: fullName,
        username,
        bio: ''
      },
      { onConflict: 'id' }
    )
    .select('*')
    .single();

  if (profileError) throw httpError(400, profileError.message);

  res.status(201).json({
    message: 'Registration successful',
    user: data.user,
    session: data.session,
    profile
  });
});

export const loginUser = asyncHandler(async (req, res) => {
  requireSupabase({ serviceRole: false });

  const email = validateEmail(req.body.email);
  const password = requiredExactString(req.body.password, 'Password', 200);

  const { data, error } = await supabaseAuth.auth.signInWithPassword({ email, password });

  if (error) throw httpError(401, error.message || 'Invalid email or password.');
  if (!data?.session) throw httpError(401, 'Login failed. Please confirm your email and try again.');

  const profile = await ensureProfileForUser(data.user);

  res.json({
    message: 'Login successful',
    session: data.session,
    user: data.user,
    profile
  });
});

export const logoutUser = asyncHandler(async (req, res) => {
  res.json({ message: 'Logout successful' });
});

export const getSession = asyncHandler(async (req, res) => {
  const profile = await ensureProfileForUser(req.user);
  res.json({ user: req.user, profile });
});
