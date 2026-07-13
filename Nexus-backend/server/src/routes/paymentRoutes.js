import { Router } from 'express';
import { body } from 'express-validator';
import * as paymentController from '../controllers/paymentController.js';
import { protect } from '../middleware/auth.js';
import { validateRequest } from '../middleware/errorHandler.js';

const router = Router();
router.use(protect);

const amountValidator = body('amount').isFloat({ gt: 0 }).withMessage('Amount must be greater than 0');

router.post('/deposit', [amountValidator], validateRequest, paymentController.createDeposit);
router.post('/withdraw', [amountValidator], validateRequest, paymentController.createWithdrawal);
router.post(
  '/transfer',
  [amountValidator, body('toUserId').notEmpty().withMessage('toUserId is required')],
  validateRequest,
  paymentController.createTransfer
);
router.get('/transactions', paymentController.listMyTransactions);

export default router;
