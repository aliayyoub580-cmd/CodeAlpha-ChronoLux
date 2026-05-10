import { Router } from 'express';

import { sharePost } from '../controllers/shareController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/:postId/share', requireAuth, sharePost);

export default router;
