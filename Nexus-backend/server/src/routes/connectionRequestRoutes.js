import { Router } from 'express';
import { body } from 'express-validator';
import * as connectionRequestController from '../controllers/connectionRequestController.js';
import { protect } from '../middleware/auth.js';
import { validateRequest } from '../middleware/errorHandler.js';

const router = Router();
router.use(protect);

router.post(
  '/',
  [
    body('entrepreneurId').notEmpty().withMessage('entrepreneurId is required'),
    body('message').optional().trim().isLength({ max: 1000 }),
  ],
  validateRequest,
  connectionRequestController.createConnectionRequest
);

router.get('/', connectionRequestController.listMyConnectionRequests);

router.patch(
  '/:id/status',
  [body('status').isIn(['accepted', 'rejected'])],
  validateRequest,
  connectionRequestController.updateConnectionRequestStatus
);

export default router;
