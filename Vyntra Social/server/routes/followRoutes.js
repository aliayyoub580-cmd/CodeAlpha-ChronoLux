import { Router } from 'express';

import { followUser, getFollowers, getFollowing, unfollowUser } from '../controllers/followController.js';
import { getUserPosts } from '../controllers/postController.js';
import { optionalAuth, requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/:userId/posts', optionalAuth, getUserPosts);
router.post('/:userId/follow', requireAuth, followUser);
router.delete('/:userId/follow', requireAuth, unfollowUser);
router.get('/:userId/followers', optionalAuth, getFollowers);
router.get('/:userId/following', optionalAuth, getFollowing);

export default router;
