import mongoose, { Document, Schema } from 'mongoose';

export interface IOTP extends Document {
  phoneNumber: string;
  otp: string;
  expiresAt: Date;
  attempts: number;
  isVerified: boolean;
  createdAt: Date;
}

const OTPSchema = new Schema<IOTP>(
  {
    phoneNumber: {
      type: String,
      required: true,
      index: true
    },
    otp: {
      type: String,
      required: true
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 }
    },
    attempts: {
      type: Number,
      default: 0,
      max: 5
    },
    isVerified: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Clean up old OTPs
OTPSchema.index({ createdAt: 1 }, { expireAfterSeconds: 600 }); // 10 minutes

export const OTP = mongoose.model<IOTP>('OTP', OTPSchema);

