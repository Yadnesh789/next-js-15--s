import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  phoneNumber: string;
  isVerified: boolean;
  sessions: Array<{
    sessionId: string;
    deviceInfo: string;
    ipAddress: string;
    lastActive: Date;
    refreshToken?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    phoneNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: [/^\+?[1-9]\d{1,14}$/, 'Please enter a valid phone number']
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    sessions: [{
      sessionId: {
        type: String,
        required: true
      },
      deviceInfo: {
        type: String,
        default: 'Unknown Device'
      },
      ipAddress: {
        type: String,
        default: ''
      },
      lastActive: {
        type: Date,
        default: Date.now
      },
      refreshToken: {
        type: String
      }
    }]
  },
  {
    timestamps: true
  }
);

// Indexes
UserSchema.index({ phoneNumber: 1 });
UserSchema.index({ 'sessions.sessionId': 1 });

export const User = mongoose.model<IUser>('User', UserSchema);

