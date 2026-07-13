import { Router } from 'express';
import { body } from 'express-validator';
import rateLimit from 'express-rate-limit';
import * as authController from '../controllers/authController.js';
import { validateRequest } from '../middleware/errorHandler.js';
import { protect } from '../middleware/auth.js';

const router = Router();

// Tighter limiter on auth endpoints to slow down credential-stuffing/brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'fail', message: 'Too many attempts. Please try again later.' },
});

const roleValidator = body('role').isIn(['entrepreneur', 'investor']).withMessage('Invalid role');
const emailValidator = body('email').isEmail().withMessage('Valid email required').normalizeEmail();
const passwordValidator = body('password')
  .isLength({ min: 8 })
  .withMessage('Password must be at least 8 characters')
  .matches(/\d/)
  .withMessage('Password must contain a number');

router.post(
  '/register',
  authLimiter,
  [
    body('name').trim().notEmpty().withMessage('Name is required').escape(),
    emailValidator,
    passwordValidator,
    roleValidator,
  ],
  validateRequest,
  authController.register
);

router.post(
  '/login',
  authLimiter,
  [emailValidator, body('password').notEmpty(), roleValidator],
  validateRequest,
  authController.login
);

router.post(
  '/verify-otp',
  authLimiter,
  [body('userId').notEmpty(), body('otp').isLength({ min: 6, max: 6 })],
  validateRequest,
  authController.verifyLoginOtp
);

router.post('/refresh', authController.refresh);
router.post('/logout', protect, authController.logout);

router.post(
  '/forgot-password',
  authLimiter,
  [emailValidator],
  validateRequest,
  authController.forgotPassword
);

router.post(
  '/reset-password',
  authLimiter,
  [
    body('token').notEmpty().withMessage('Reset token is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/\d/)
      .withMessage('Password must contain a number'),
  ],
  validateRequest,
  authController.resetPassword
);

router.get('/me', protect, authController.getMe);

export default router;
