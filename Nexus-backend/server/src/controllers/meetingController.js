import crypto from 'crypto';
import { Meeting } from '../models/Meeting.js';
import { catchAsync, AppError } from '../utils/AppError.js';

// A user has a conflict if any existing non-cancelled/rejected meeting of
// theirs overlaps [startTime, endTime).
const hasConflict = async (userId, startTime, endTime, excludeMeetingId) => {
  const query = {
    $or: [{ organizer: userId }, { participant: userId }],
    status: { $in: ['pending', 'accepted'] },
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
  };
  if (excludeMeetingId) query._id = { $ne: excludeMeetingId };
  return Meeting.exists(query);
};

export const createMeeting = catchAsync(async (req, res, next) => {
  const { participantId, title, description, startTime, endTime } = req.body;
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (end <= start) return next(new AppError('endTime must be after startTime.', 400));
  if (start < new Date()) return next(new AppError('Cannot schedule a meeting in the past.', 400));

  const [organizerConflict, participantConflict] = await Promise.all([
    hasConflict(req.user._id, start, end),
    hasConflict(participantId, start, end),
  ]);
  if (organizerConflict) return next(new AppError('You already have a meeting in that time slot.', 409));
  if (participantConflict) {
    return next(new AppError('The other participant is unavailable at that time.', 409));
  }

  const meeting = await Meeting.create({
    organizer: req.user._id,
    participant: participantId,
    title,
    description,
    startTime: start,
    endTime: end,
    roomId: crypto.randomUUID(),
  });

  res.status(201).json({ status: 'success', meeting });
});

export const listMyMeetings = catchAsync(async (req, res) => {
  const { status, from, to } = req.query;
  const filter = { $or: [{ organizer: req.user._id }, { participant: req.user._id }] };
  if (status) filter.status = status;
  if (from || to) {
    filter.startTime = {};
    if (from) filter.startTime.$gte = new Date(from);
    if (to) filter.startTime.$lte = new Date(to);
  }

  const meetings = await Meeting.find(filter)
    .populate('organizer', 'name avatarUrl role')
    .populate('participant', 'name avatarUrl role')
    .sort('startTime');

  res.status(200).json({ status: 'success', results: meetings.length, meetings });
});

const assertParticipantOrOrganizer = (meeting, userId) => {
  const isOrganizer = String(meeting.organizer) === String(userId);
  const isParticipant = String(meeting.participant) === String(userId);
  return isOrganizer || isParticipant;
};

export const updateMeetingStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body; // 'accepted' | 'rejected' | 'cancelled' | 'completed'
  const meeting = await Meeting.findById(req.params.id);
  if (!meeting) return next(new AppError('Meeting not found.', 404));
  if (!assertParticipantOrOrganizer(meeting, req.user._id)) {
    return next(new AppError('You are not part of this meeting.', 403));
  }

  // Only the invited participant accepts/rejects; either side can cancel
  if (['accepted', 'rejected'].includes(status) && String(meeting.participant) !== String(req.user._id)) {
    return next(new AppError('Only the invited participant can accept or reject.', 403));
  }

  meeting.status = status;
  await meeting.save();

  res.status(200).json({ status: 'success', meeting });
});

export const deleteMeeting = catchAsync(async (req, res, next) => {
  const meeting = await Meeting.findById(req.params.id);
  if (!meeting) return next(new AppError('Meeting not found.', 404));
  if (String(meeting.organizer) !== String(req.user._id)) {
    return next(new AppError('Only the organizer can delete this meeting.', 403));
  }
  await meeting.deleteOne();
  res.status(204).send();
});
