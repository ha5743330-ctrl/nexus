import { Router } from 'express';
import * as userController from '../controllers/userController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.use(protect);

router.patch('/me', userController.updateMyProfile);
router.get('/role/:role', userController.listUsersByRole); // /api/users/role/investor
router.get('/:id', userController.getUserById);

export default router;
