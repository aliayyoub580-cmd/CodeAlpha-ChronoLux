import { Router } from 'express';

import { createPost, deletePost, getPosts, getSinglePost, updatePost } from '../controllers/postController.js';
import { optionalAuth, requireAuth } from '../middleware/authMiddleware.js';
import { postMediaUpload } from '../middleware/uploadMiddleware.js';

const router = Router();

router.get('/', optionalAuth, getPosts);
router.get('/:id', optionalAuth, getSinglePost);
router.post('/', requireAuth, postMediaUpload, createPost);
router.put('/:id', requireAuth, updatePost);
router.delete('/:id', requireAuth, deletePost);

export default router;
