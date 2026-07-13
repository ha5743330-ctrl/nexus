import { Message } from '../models/Message.js';
import { catchAsync } from '../utils/AppError.js';

export const getConversation = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const messages = await Message.find({
    $or: [
      { sender: req.user._id, receiver: userId },
      { sender: userId, receiver: req.user._id },
    ],
  })
    .populate('sender', 'name avatarUrl role')
    .populate('receiver', 'name avatarUrl role')
    .sort('createdAt');

  await Message.updateMany(
    { sender: userId, receiver: req.user._id, isRead: false },
    { isRead: true }
  );

  res.status(200).json({ status: 'success', results: messages.length, messages });
});

// Returns one row per conversation partner, each enriched with that
// partner's public profile info (name/avatar/role/online) so the frontend
// doesn't need a separate lookup call per conversation.
export const listConversations = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const conversations = await Message.aggregate([
    { $match: { $or: [{ sender: userId }, { receiver: userId }] } },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: {
          $cond: [{ $eq: ['$sender', userId] }, '$receiver', '$sender'],
        },
        lastMessage: { $first: '$$ROOT' },
        unreadCount: {
          $sum: {
            $cond: [{ $and: [{ $eq: ['$receiver', userId] }, { $eq: ['$isRead', false] }] }, 1, 0],
          },
        },
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'partner',
      },
    },
    { $unwind: '$partner' },
    {
      $project: {
        _id: 1,
        lastMessage: 1,
        unreadCount: 1,
        'partner._id': 1,
        'partner.name': 1,
        'partner.avatarUrl': 1,
        'partner.role': 1,
        'partner.isOnline': 1,
      },
    },
    { $sort: { 'lastMessage.createdAt': -1 } },
  ]);

  res.status(200).json({ status: 'success', conversations });
});
