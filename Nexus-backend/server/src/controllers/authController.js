import { User } from '../models/User.js';
import { catchAsync, AppError } from '../utils/AppError.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  generateRawToken,
  hashToken,
  generateOtp,
} from '../utils/tokens.js';
import { sendPasswordResetEmail, sendOtpEmail } from '../utils/email.js';

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
};

const issueTokens = async (res, user) => {
  const accessToken = signAccessToken(user._id, user.role);
  const refreshToken = signRefreshToken(user._id);

  user.refreshTokens = [...(user.refreshTokens || []), refreshToken].slice(-5); // keep last 5 devices
  await user.save({ validateBeforeSave: false });

  res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);
  return accessToken;
};

export const register = catchAsync(async (req, res, next) => {
  const { name, email, password, role, ...roleFields } = req.body;

  const existing = await User.findOne({ email });
  if (existing) return next(new AppError('An account with this email already exists.', 409));

  const user = await User.create({ name, email, password, role, ...roleFields });
  const accessToken = await issueTokens(res, user);

  res.status(201).json({ status: 'success', accessToken, user: user.toPublicJSON() });
});

export const login = catchAsync(async (req, res, next) => {
  const { email, password, role } = req.body;

  const user = await User.findOne({ email, role }).select('+password +refreshTokens');
  if (!user || !(await user.comparePassword(password))) {
    return next(new AppError('Invalid email, password, or role.', 401));
  }

  if (user.twoFactorEnabled) {
    const otp = generateOtp();
    user.twoFactorOtp = hashToken(otp);
    user.twoFactorOtpExpires = Date.now() + 10 * 60 * 1000;
    await user.save({ validateBeforeSave: false });
    await sendOtpEmail(user.email, otp);

    return res.status(200).json({
      status: 'pending_2fa',
      message: 'A verification code has been sent to your email.',
      userId: user._id,
    });
  }

  user.isOnline = true;
  const accessToken = await issueTokens(res, user);
  await user.save({ validateBeforeSave: false });

  res.status(200).json({ status: 'success', accessToken, user: user.toPublicJSON() });
});

// Step 2 of login when 2FA is enabled
export const verifyLoginOtp = catchAsync(async (req, res, next) => {
  const { userId, otp } = req.body;

  const user = await User.findById(userId).select('+twoFactorOtp +twoFactorOtpExpires');
  if (!user || !user.twoFactorOtp || user.twoFactorOtpExpires < Date.now()) {
    return next(new AppError('Verification code expired. Please log in again.', 400));
  }
  if (hashToken(otp) !== user.twoFactorOtp) {
    return next(new AppError('Incorrect verification code.', 400));
  }

  user.twoFactorOtp = undefined;
  user.twoFactorOtpExpires = undefined;
  user.isOnline = true;
  const accessToken = await issueTokens(res, user);
  await user.save({ validateBeforeSave: false });

  res.status(200).json({ status: 'success', accessToken, user: user.toPublicJSON() });
});

export const refresh = catchAsync(async (req, res, next) => {
  const token = req.cookies?.refreshToken;
  if (!token) return next(new AppError('No refresh token provided.', 401));

  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch {
    return next(new AppError('Refresh token invalid or expired. Please log in again.', 401));
  }

  const user = await User.findById(decoded.sub).select('+refreshTokens');
  if (!user || !user.refreshTokens.includes(token)) {
    return next(new AppError('Refresh token not recognized. Please log in again.', 401));
  }

  const accessToken = signAccessToken(user._id, user.role);
  res.status(200).json({ status: 'success', accessToken });
});

export const logout = catchAsync(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (token && req.user) {
    req.user.refreshTokens = (req.user.refreshTokens || []).filter((t) => t !== token);
    req.user.isOnline = false;
    await req.user.save({ validateBeforeSave: false });
  }
  res.clearCookie('refreshToken', REFRESH_COOKIE_OPTIONS);
  res.status(200).json({ status: 'success' });
});

export const forgotPassword = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });
  // Always respond 200 to avoid leaking which emails are registered
  if (!user) {
    return res.status(200).json({
      status: 'success',
      message: 'If that email is registered, a reset link has been sent.',
    });
  }

  const rawToken = generateRawToken();
  user.passwordResetToken = hashToken(rawToken);
  user.passwordResetExpires = Date.now() + 30 * 60 * 1000;
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${rawToken}`;
  await sendPasswordResetEmail(user.email, resetUrl);

  res.status(200).json({
    status: 'success',
    message: 'If that email is registered, a reset link has been sent.',
  });
});

export const resetPassword = catchAsync(async (req, res, next) => {
  const { token, newPassword } = req.body;
  const hashedToken = hashToken(token);

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  }).select('+password');

  if (!user) return next(new AppError('Reset token is invalid or has expired.', 400));

  user.password = newPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.refreshTokens = []; // force re-login on all devices
  await user.save();

  res.status(200).json({ status: 'success', message: 'Password has been reset. Please log in.' });
});

export const getMe = catchAsync(async (req, res) => {
  res.status(200).json({ status: 'success', user: req.user.toPublicJSON() });
});
