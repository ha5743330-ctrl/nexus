import mongoose from 'mongoose';

const meetingSchema = new mongoose.Schema(
  {
    organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    participant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, maxlength: 1000 },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'cancelled', 'completed'],
      default: 'pending',
    },
    roomId: { type: String }, // used for video call signaling room
  },
  { timestamps: true }
);

meetingSchema.index({ organizer: 1, startTime: 1 });
meetingSchema.index({ participant: 1, startTime: 1 });

meetingSchema.pre('validate', function validateTimes(next) {
  if (this.startTime && this.endTime && this.endTime <= this.startTime) {
    return next(new Error('endTime must be after startTime'));
  }
  next();
});

export const Meeting = mongoose.model('Meeting', meetingSchema);
