import { OTP, IOTP } from '../models/OTP';
import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

export class OTPService {
  private static generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  static async sendOTP(phoneNumber: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Delete any existing OTP for this phone number
      await OTP.deleteMany({ phoneNumber });

      // Generate new OTP
      const otpCode = this.generateOTP();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + parseInt(process.env.OTP_EXPIRY_MINUTES || '5'));

      // Save OTP to database
      const otpRecord = new OTP({
        phoneNumber,
        otp: otpCode,
        expiresAt
      });
      await otpRecord.save();

      // Send SMS via Twilio
      if (client && twilioPhone) {
        try {
          const message = await client.messages.create({
            body: `Your verification code is: ${otpCode}. Valid for ${process.env.OTP_EXPIRY_MINUTES || 5} minutes.`,
            from: twilioPhone,
            to: phoneNumber
          });
          
          return { success: true, messageId: message.sid };
        } catch (twilioError: any) {
          console.error('Twilio error:', twilioError);
          // In development, log OTP instead of failing
          if (process.env.NODE_ENV === 'development') {
            console.log(`📱 OTP for ${phoneNumber}: ${otpCode}`);
            return { success: true, messageId: 'dev-mode' };
          }
          return { success: false, error: 'Failed to send SMS' };
        }
      } else {
        // Development mode - just log the OTP
        console.log(`📱 OTP for ${phoneNumber}: ${otpCode}`);
        return { success: true, messageId: 'dev-mode' };
      }
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      return { success: false, error: error.message };
    }
  }

  static async verifyOTP(phoneNumber: string, otp: string): Promise<{ success: boolean; error?: string }> {
    try {
      const otpRecord = await OTP.findOne({
        phoneNumber,
        otp,
        expiresAt: { $gt: new Date() },
        isVerified: false
      });

      if (!otpRecord) {
        // Increment attempts for any existing record
        const existingRecord = await OTP.findOne({ phoneNumber });
        if (existingRecord) {
          existingRecord.attempts += 1;
          await existingRecord.save();
        }
        return { success: false, error: 'Invalid or expired OTP' };
      }

      if (otpRecord.attempts >= 5) {
        return { success: false, error: 'Maximum OTP verification attempts exceeded' };
      }

      // Mark as verified
      otpRecord.isVerified = true;
      await otpRecord.save();

      return { success: true };
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      return { success: false, error: error.message };
    }
  }
}

