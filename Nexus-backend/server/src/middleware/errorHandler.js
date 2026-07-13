import { validationResult } from 'express-validator';
import { AppError } from '../utils/AppError.js';

// Run after express-validator check() chains in a route to short-circuit on bad input
export const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      status: 'fail',
      message: 'Validation failed',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

const handleMongoErrors = (err) => {
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return new AppError(`${field} already in use.`, 409);
  }
  if (err.name === 'CastError') {
    return new AppError(`Invalid ${err.path}: ${err.value}`, 400);
  }
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors)
      .map((e) => e.message)
      .join('. ');
    return new AppError(message, 400);
  }
  return err;
};

export const notFound = (req, res, next) => {
  next(new AppError(`Route not found: ${req.originalUrl}`, 404));
};

// eslint-disable-next-line no-unused-vars
export const globalErrorHandler = (err, req, res, next) => {
  let error = handleMongoErrors(err);
  const statusCode = error.statusCode || 500;
  const isOperational = error.isOperational || false;

  if (!isOperational) {
    console.error('UNEXPECTED ERROR:', err);
  }

  res.status(statusCode).json({
    status: error.status || 'error',
    message: isOperational ? error.message : 'Something went wrong. Please try again later.',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
