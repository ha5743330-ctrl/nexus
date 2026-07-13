import mongoose from 'mongoose';

const signatureSchema = new mongoose.Schema(
  {
    signedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    signatureImageUrl: { type: String, required: true },
    signedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const documentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, required: true }, // mime type
    size: { type: Number, required: true }, // bytes
    url: { type: String, required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    version: { type: Number, default: 1 },
    status: {
      type: String,
      enum: ['draft', 'pending_signature', 'signed', 'archived'],
      default: 'draft',
    },
    signatures: [signatureSchema],
  },
  { timestamps: true }
);

documentSchema.index({ owner: 1 });

export const Document = mongoose.model('Document', documentSchema);
