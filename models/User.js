const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters long'],
    maxlength: [20, 'Username cannot exceed 20 characters'],
    match: [/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens']
  },
  password: {
    type: String,
    // Make password optional for OTP users
    required: false,
    minlength: [6, 'Password must be at least 6 characters long']
  },
  // OTP fields for the new authentication system
  otp: {
    type: String,
    default: null
  },
  otpExpiry: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: null
  },
  loginCount: {
    type: Number,
    default: 0
  },
  gameStats: {
    totalPlayTime: { type: Number, default: 0 },
    gamesPlayed: { type: Number, default: 0 },
    highScore: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Hash password before saving (only if password is provided)
userSchema.pre('save', async function (next) {
  // Only hash password if it exists and has been modified
  if (!this.isModified('password') || !this.password) return next();

  try {
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password (only if password exists)
userSchema.methods.comparePassword = async function (candidatePassword) {
  // If no password is set, return false
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to get public profile (without password)
userSchema.methods.getPublicProfile = function () {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.otp;
  delete userObject.otpExpiry;
  return userObject;
};

// Method to set OTP
userSchema.methods.setOTP = function (otp, expiryMinutes = 10) {
  this.otp = otp;
  this.otpExpiry = new Date(Date.now() + expiryMinutes * 60 * 1000);
};

// Method to verify OTP
userSchema.methods.verifyOTP = function (enteredOtp) {
  if (!this.otp || !this.otpExpiry) return false;
  if (this.otpExpiry < new Date()) return false; // OTP expired
  return this.otp === enteredOtp;
};

// Method to clear OTP after use
userSchema.methods.clearOTP = function () {
  this.otp = null;
  this.otpExpiry = null;
};

// Index for better query performance
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ createdAt: -1 });

const User = mongoose.model('User', userSchema);

module.exports = User;