import { Router } from 'express';
import { body } from 'express-validator';
import * as meetingController from '../controllers/meetingController.js';
import { protect } from '../middleware/auth.js';
import { validateRequest } from '../middleware/errorHandler.js';

const router = Router();
router.use(protect);

router.post(
  '/',
  [
    body('participantId').notEmpty().withMessage('participantId is required'),
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('startTime').isISO8601().withMessage('startTime must be a valid date'),
    body('endTime').isISO8601().withMessage('endTime must be a valid date'),
  ],
  validateRequest,
  meetingController.createMeeting
);

router.get('/', meetingController.listMyMeetings);

router.patch(
  '/:id/status',
  [body('status').isIn(['accepted', 'rejected', 'cancelled', 'completed'])],
  validateRequest,
  meetingController.updateMeetingStatus
);

router.delete('/:id', meetingController.deleteMeeting);

export default router;
