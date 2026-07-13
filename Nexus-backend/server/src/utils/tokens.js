import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export const signAccessToken = (userId, role) =>
  jwt.sign({ sub: userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

export const signRefreshToken = (userId) =>
  jwt.sign({ sub: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  });

export const verifyAccessToken = (token) => jwt.verify(token, process.env.JWT_SECRET);

export const verifyRefreshToken = (token) => jwt.verify(token, process.env.JWT_REFRESH_SECRET);

// Used for password reset links and email verification
export const generateRawToken = () => crypto.randomBytes(32).toString('hex');

export const hashToken = (rawToken) =>
  crypto.createHash('sha256').update(rawToken).digest('hex');

// Simple 6-digit OTP for the 2FA mockup
export const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));
