import { Router } from 'express';

import { getNews, refreshNews } from '../controllers/newsController.js';

const router = Router();

router.get('/', getNews);
router.get('/refresh', refreshNews);

export default router;
