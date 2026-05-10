import { Router } from 'express';

import { createRepost, removeRepost } from '../controllers/repostController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/:postId/repost', requireAuth, createRepost);
router.delete('/:postId/repost', requireAuth, removeRepost);

export default router;
