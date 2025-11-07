import express, { Request, Response } from 'express';
const router = express.Router();

// Test endpoint to validate Twilio configuration
router.get('/test-twilio-config', (req: Request, res: Response) => {
  try {
    const config = {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      phoneNumber: process.env.TWILIO_PHONE_NUMBER,
      nodeEnv: process.env.NODE_ENV
    };

    const validation = {
      accountSid: {
        exists: !!config.accountSid,
        format: config.accountSid?.startsWith('AC') && config.accountSid?.length === 34,
        value: config.accountSid ? `${config.accountSid.substring(0, 6)}...` : 'Not set'
      },
      authToken: {
        exists: !!config.authToken,
        format: config.authToken?.length === 32,
        value: config.authToken ? `${config.authToken.substring(0, 6)}...` : 'Not set'
      },
      phoneNumber: {
        exists: !!config.phoneNumber,
        format: config.phoneNumber?.match(/^\+[1-9]\d{1,14}$/),
        value: config.phoneNumber || 'Not set'
      }
    };

    const isProperlyConfigured = 
      validation.accountSid.exists && validation.accountSid.format &&
      validation.authToken.exists && validation.authToken.format &&
      validation.phoneNumber.exists && validation.phoneNumber.format;

    res.json({
      configured: isProperlyConfigured,
      environment: config.nodeEnv,
      validation,
      message: isProperlyConfigured 
        ? 'Twilio is properly configured for SMS sending'
        : 'Twilio configuration is incomplete or invalid'
    });

  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to validate Twilio configuration',
      details: error.message
    });
  }
});

export default router;
