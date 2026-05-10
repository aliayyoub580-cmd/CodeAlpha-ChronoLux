import { Router } from 'express';

import { addComment, deleteComment, getComments } from '../controllers/commentController.js';
import { optionalAuth, requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/posts/:postId/comments', optionalAuth, getComments);
router.post('/posts/:postId/comments', requireAuth, addComment);
router.delete('/comments/:id', requireAuth, deleteComment);

export default router;
