import { ConnectionRequest } from '../models/ConnectionRequest.js';
import { User } from '../models/User.js';
import { catchAsync, AppError } from '../utils/AppError.js';

export const createConnectionRequest = catchAsync(async (req, res, next) => {
  const { entrepreneurId, message } = req.body;

  if (req.user.role !== 'investor') {
    return next(new AppError('Only investors can send collaboration requests.', 403));
  }

  const entrepreneur = await User.findById(entrepreneurId);
  if (!entrepreneur || entrepreneur.role !== 'entrepreneur') {
    return next(new AppError('Entrepreneur not found.', 404));
  }

  const existing = await ConnectionRequest.findOne({
    investor: req.user._id,
    entrepreneur: entrepreneurId,
  });
  if (existing) {
    return next(new AppError('You have already sent a request to this entrepreneur.', 409));
  }

  const request = await ConnectionRequest.create({
    investor: req.user._id,
    entrepreneur: entrepreneurId,
    message,
  });

  await request.populate('investor', 'name avatarUrl role');
  await request.populate('entrepreneur', 'name avatarUrl role');

  res.status(201).json({ status: 'success', request });
});

export const listMyConnectionRequests = catchAsync(async (req, res) => {
  const filter =
    req.user.role === 'investor' ? { investor: req.user._id } : { entrepreneur: req.user._id };

  const requests = await ConnectionRequest.find(filter)
    .populate('investor', 'name avatarUrl role')
    .populate('entrepreneur', 'name avatarUrl role')
    .sort('-createdAt');

  res.status(200).json({ status: 'success', results: requests.length, requests });
});

export const updateConnectionRequestStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body; // 'accepted' | 'rejected'
  const request = await ConnectionRequest.findById(req.params.id);
  if (!request) return next(new AppError('Request not found.', 404));

  if (String(request.entrepreneur) !== String(req.user._id)) {
    return next(new AppError('Only the invited entrepreneur can respond to this request.', 403));
  }

  request.status = status;
  await request.save();
  await request.populate('investor', 'name avatarUrl role');
  await request.populate('entrepreneur', 'name avatarUrl role');

  res.status(200).json({ status: 'success', request });
});
