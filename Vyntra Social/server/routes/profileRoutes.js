import { Router } from 'express';

import {
  getProfileById,
  getProfileByUsername,
  listProfiles,
  updateProfile,
  uploadCoverImage,
  uploadProfileImage
} from '../controllers/profileController.js';
import { optionalAuth, requireAuth } from '../middleware/authMiddleware.js';
import { coverImageUpload, profileImageUpload } from '../middleware/uploadMiddleware.js';

const router = Router();

router.get('/', optionalAuth, listProfiles);
router.get('/username/:username', optionalAuth, getProfileByUsername);
router.get('/:id', optionalAuth, getProfileById);
router.put('/:id', requireAuth, updateProfile);
router.post('/:id/profile-image', requireAuth, profileImageUpload, uploadProfileImage);
router.post('/:id/cover-image', requireAuth, coverImageUpload, uploadCoverImage);

export default router;
