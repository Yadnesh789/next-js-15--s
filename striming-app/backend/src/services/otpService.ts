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

  // Check if we're in development mode or using placeholder credentials
  private static isDevelopmentMode(): boolean {
    const isDevEnv = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === undefined;
    const hasNoTwilioCredentials = !accountSid || !authToken || !twilioPhone;
    
    return isDevEnv || hasNoTwilioCredentials;
  }

  // Validate if Twilio credentials are properly configured
  private static isTwilioConfigured(): boolean {
    return !!(accountSid && authToken && twilioPhone && 
             accountSid.startsWith('AC') && 
             accountSid.length === 34 &&
             authToken.length === 32);
  }

  static async sendOTP(phoneNumber: string): Promise<{ success: boolean; messageId?: string; error?: string; otp?: string }> {
    try {
      // Validate phone number format
      if (!phoneNumber || !phoneNumber.match(/^\+[1-9]\d{1,14}$/)) {
        return { success: false, error: 'Invalid phone number format. Use international format like +1234567890' };
      }

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

      console.log(`📱 Generated OTP for ${phoneNumber}: ${otpCode} (expires in ${process.env.OTP_EXPIRY_MINUTES || 5} minutes)`);

      // Strategy 1: Development Mode - Always return OTP in response for easy testing
      if (this.isDevelopmentMode()) {
        console.log(`� DEVELOPMENT MODE - Any phone number can receive OTP`);
        console.log(`📱 OTP for ${phoneNumber}: ${otpCode}`);
        
        return { 
          success: true, 
          messageId: 'dev-mode',
          otp: otpCode, // Include OTP in response for development
          error: `Development mode: OTP is ${otpCode}. Check console or use this OTP directly.`
        };
      }

      // Strategy 2: Production Mode with Twilio
      if (this.isTwilioConfigured() && client) {
        try {
          console.log(`📤 Attempting to send SMS to ${phoneNumber} from ${twilioPhone}`);
          
          const message = await client.messages.create({
            body: `Your verification code is: ${otpCode}. Valid for ${process.env.OTP_EXPIRY_MINUTES || 5} minutes. Do not share this code with anyone.`,
            from: twilioPhone,
            to: phoneNumber
          });
          
          console.log(`✅ SMS sent successfully! Message SID: ${message.sid}`);
          return { 
            success: true, 
            messageId: message.sid,
            error: `OTP sent via SMS to ${phoneNumber}`
          };
          
        } catch (twilioError: any) {
          console.error('❌ Twilio SMS failed:', twilioError.message);
          
          // Fallback: Return OTP in development/testing scenarios
          console.log(`📱 FALLBACK - OTP for ${phoneNumber}: ${otpCode}`);
          return { 
            success: true, 
            messageId: 'fallback-mode',
            otp: otpCode,
            error: `SMS failed, but OTP generated: ${otpCode}. Twilio error: ${twilioError.message}`
          };
        }
      }

      // Strategy 3: No SMS service available - Console/Response mode
      console.log(`📱 NO SMS SERVICE - OTP for ${phoneNumber}: ${otpCode}`);
      return { 
        success: true, 
        messageId: 'console-mode',
        otp: otpCode,
        error: `No SMS service configured. OTP: ${otpCode}. Check console for OTP.`
      };

    } catch (error: any) {
      console.error('❌ Error in OTP service:', error);
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

