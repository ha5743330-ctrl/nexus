import { Router } from 'express';
import * as messageController from '../controllers/messageController.js';
import { protect } from '../middleware/auth.js';

const router = Router();
router.use(protect);

router.get('/', messageController.listConversations);
router.get('/:userId', messageController.getConversation);

export default router;
