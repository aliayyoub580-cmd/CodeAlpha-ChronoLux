import { Router } from 'express';

import { likePost, unlikePost } from '../controllers/likeController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/:postId/like', requireAuth, likePost);
router.delete('/:postId/like', requireAuth, unlikePost);

export default router;
