import { httpError } from './http.js';

const imageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const pdfTypes = new Set(['application/pdf']);

export function requiredString(value, field, max = 5000) {
  const cleaned = typeof value === 'string' ? value.trim() : '';
  if (!cleaned) throw httpError(400, `${field} is required.`);
  if (cleaned.length > max) throw httpError(400, `${field} is too long.`);
  return cleaned;
}

export function requiredExactString(value, field, max = 5000) {
  if (typeof value !== 'string') throw httpError(400, `${field} is required.`);
  if (!value.length) throw httpError(400, `${field} is required.`);
  if (value.length > max) throw httpError(400, `${field} is too long.`);
  return value;
}

export function optionalString(value, max = 5000) {
  if (typeof value !== 'string') return null;
  const cleaned = value.trim();
  if (!cleaned) return null;
  if (cleaned.length > max) throw httpError(400, 'Input is too long.');
  return cleaned;
}

export function optionalImageUrl(value) {
  const cleaned = optionalString(value, 2048);
  if (!cleaned) return null;

  let url;
  try {
    url = new URL(cleaned);
  } catch (error) {
    throw httpError(400, 'Image URL must be a valid URL.');
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw httpError(400, 'Image URL must start with http or https.');
  }

  return url.toString();
}

export function normalizeUsername(username) {
  const cleaned = requiredString(username, 'Username', 30).replace(/^@/, '').trim();
  if (!/^[A-Za-z0-9_]{3,30}$/.test(cleaned)) {
    throw httpError(400, 'Username must be 3-30 characters and use letters, numbers, or underscores.');
  }
  return cleaned.toLowerCase();
}

export function validatePassword(password, confirmPassword) {
  if (typeof password !== 'string' || password.length < 8) {
    throw httpError(400, 'Password must be at least 8 characters.');
  }
  if (confirmPassword !== undefined && password !== confirmPassword) {
    throw httpError(400, 'Confirm password must match password.');
  }
}

export function validateEmail(email) {
  const cleaned = requiredString(email, 'Email', 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
    throw httpError(400, 'Please enter a valid email address.');
  }
  return cleaned;
}

export function validateImageFile(file, maxBytes, label = 'Image') {
  if (!file) return;
  if (!imageTypes.has(file.mimetype)) {
    throw httpError(400, `${label} must be JPG, PNG, or WEBP.`);
  }
  if (file.size > maxBytes) {
    throw httpError(400, `${label} is too large.`);
  }
}

export function validatePdfFile(file, maxBytes) {
  if (!file) return;
  if (!pdfTypes.has(file.mimetype)) {
    throw httpError(400, 'PDF file must be a PDF.');
  }
  if (file.size > maxBytes) {
    throw httpError(400, 'PDF file is too large.');
  }
}
