import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: ['entrepreneur', 'investor'], required: true },
    avatarUrl: { type: String, default: '' },
    bio: { type: String, default: '', maxlength: 1000 },
    isOnline: { type: Boolean, default: false },

    // Security
    isEmailVerified: { type: Boolean, default: false },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorOtp: String,
    twoFactorOtpExpires: Date,
    refreshTokens: [{ type: String, select: false }],

    // Entrepreneur-specific
    startupName: String,
    pitchSummary: String,
    fundingNeeded: String,
    industry: String,
    location: String,
    foundedYear: Number,
    teamSize: Number,

    // Investor-specific
    investmentInterests: [String],
    investmentStage: [String],
    portfolioCompanies: [String],
    totalInvestments: Number,
    minimumInvestment: String,
    maximumInvestment: String,
  },
  { timestamps: true }
);

userSchema.index({ role: 1 });

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  if (!this.isNew) this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toPublicJSON = function toPublicJSON() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshTokens;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;
  delete obj.twoFactorOtp;
  delete obj.twoFactorOtpExpires;
  return obj;
};

export const User = mongoose.model('User', userSchema);
