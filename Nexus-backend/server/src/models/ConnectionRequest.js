import mongoose from 'mongoose';

const connectionRequestSchema = new mongoose.Schema(
  {
    investor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    entrepreneur: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, trim: true, maxlength: 1000 },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

// One active request per investor/entrepreneur pair
connectionRequestSchema.index({ investor: 1, entrepreneur: 1 }, { unique: true });

export const ConnectionRequest = mongoose.model('ConnectionRequest', connectionRequestSchema);
