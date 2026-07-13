import { User } from '../models/User.js';
import { catchAsync, AppError } from '../utils/AppError.js';

// Fields a user is allowed to self-update (role stays fixed after registration)
const ALLOWED_PROFILE_FIELDS = [
  'name',
  'avatarUrl',
  'bio',
  'startupName',
  'pitchSummary',
  'fundingNeeded',
  'industry',
  'location',
  'foundedYear',
  'teamSize',
  'investmentInterests',
  'investmentStage',
  'portfolioCompanies',
  'totalInvestments',
  'minimumInvestment',
  'maximumInvestment',
];

const pick = (obj, keys) =>
  keys.reduce((acc, key) => {
    if (obj[key] !== undefined) acc[key] = obj[key];
    return acc;
  }, {});

export const listUsersByRole = catchAsync(async (req, res) => {
  const { role } = req.params; // 'investor' | 'entrepreneur'
  const { search, industry, page = 1, limit = 20 } = req.query;

  const filter = { role };
  if (industry) filter.industry = industry;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { startupName: { $regex: search, $options: 'i' } },
      { bio: { $regex: search, $options: 'i' } },
    ];
  }

  const users = await User.find(filter)
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .sort('-createdAt');

  const total = await User.countDocuments(filter);

  res.status(200).json({
    status: 'success',
    results: users.length,
    total,
    page: Number(page),
    users: users.map((u) => u.toPublicJSON()),
  });
});

export const getUserById = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) return next(new AppError('User not found.', 404));
  res.status(200).json({ status: 'success', user: user.toPublicJSON() });
});

export const updateMyProfile = catchAsync(async (req, res, next) => {
  if (req.body.password) {
    return next(new AppError('Use the password reset flow to change your password.', 400));
  }

  const updates = pick(req.body, ALLOWED_PROFILE_FIELDS);
  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({ status: 'success', user: user.toPublicJSON() });
});
