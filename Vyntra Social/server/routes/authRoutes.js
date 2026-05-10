import { Router } from 'express';

import { getSession, loginUser, logoutUser, registerUser } from '../controllers/authController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', requireAuth, logoutUser);
router.get('/session', requireAuth, getSession);

export default router;
