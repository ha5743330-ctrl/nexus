import { verifyAccessToken } from '../utils/tokens.js';
import { AppError } from '../utils/AppError.js';
import { User } from '../models/User.js';
import { catchAsync } from '../utils/AppError.js';

// Verifies the JWT and attaches the authenticated user to req.user
export const protect = catchAsync(async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('You are not logged in. Please log in to continue.', 401));
  }

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch (err) {
    return next(new AppError('Invalid or expired token. Please log in again.', 401));
  }

  const currentUser = await User.findById(decoded.sub);
  if (!currentUser) {
    return next(new AppError('The user belonging to this token no longer exists.', 401));
  }

  if (
    currentUser.passwordChangedAt &&
    decoded.iat * 1000 < currentUser.passwordChangedAt.getTime()
  ) {
    return next(new AppError('Password was recently changed. Please log in again.', 401));
  }

  req.user = currentUser;
  next();
});

// Usage: restrictTo('investor'), restrictTo('entrepreneur', 'investor')
export const restrictTo = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return next(new AppError('You do not have permission to perform this action.', 403));
  }
  next();
};

// Ensures a user can only touch their own resource unless an :id param
// resolver has already confirmed shared/ownership access upstream.
export const isSelfOrShared = (getOwnerId) => (req, res, next) => {
  const ownerId = getOwnerId(req);
  if (String(ownerId) !== String(req.user._id)) {
    return next(new AppError('You do not have access to this resource.', 403));
  }
  next();
};
