# OTP Service Setup Guide

## Current Issue
The OTP service is not sending SMS to your mobile phone because it's using placeholder Twilio credentials that don't work for real SMS delivery.

## Fix: Setup Real Twilio Account

### Step 1: Create Twilio Account
1. Go to https://www.twilio.com/try-twilio
2. Sign up for a free Twilio account
3. Verify your email and phone number

### Step 2: Get Twilio Credentials
After signing up, you'll get:
1. **Account SID** - starts with "AC" (34 characters)
2. **Auth Token** - 32 character string
3. **Phone Number** - You need to get a Twilio phone number

### Step 3: Get Twilio Phone Number
1. In Twilio Console, go to "Phone Numbers" > "Manage" > "Buy a number"
2. Choose a number from your country (India: +91)
3. Make sure it has SMS capability
4. Purchase the number (free trial gives you credit)

### Step 4: Update Environment Variables
Edit your `.env` file in the backend directory with your real Twilio credentials:

```bash
# Replace these with your actual Twilio credentials:
TWILIO_ACCOUNT_SID=AC1234567890abcdef1234567890abcdef    # Your real Account SID
TWILIO_AUTH_TOKEN=your32characterauthtokenhere123456    # Your real Auth Token  
TWILIO_PHONE_NUMBER=+1234567890                        # Your purchased Twilio number
```

### Step 5: Test Phone Number Format
Make sure you're using the correct international format for your phone number:
- India: +91xxxxxxxxxx (e.g., +919876543210)
- US: +1xxxxxxxxxx (e.g., +12345678901)
- UK: +44xxxxxxxxxx (e.g., +447123456789)

### Step 6: Restart Backend Server
After updating the .env file:
```bash
cd backend
npm run dev  # or restart your server
```

## Alternative: Use Development Mode
If you don't want to setup Twilio right now, you can use development mode:
1. Keep the current placeholder values in .env
2. When you request an OTP, check the backend console/terminal
3. The OTP will be printed in the console like: `📱 OTP for +91xxxxxxxxxx: 123456`

## Troubleshooting Common Issues

### 1. "Invalid phone number" error
- Make sure your phone number includes country code (+91 for India)
- Format: +91xxxxxxxxxx (no spaces, dashes, or parentheses)

### 2. "Failed to send SMS" error
- Check if your Twilio account has sufficient credit
- Verify your Twilio phone number has SMS capability
- Make sure the recipient number is verified (for trial accounts)

### 3. "Invalid credentials" error
- Double-check Account SID starts with "AC"
- Verify Auth Token is exactly 32 characters
- Make sure there are no extra spaces in .env file

### 4. SMS not received
- Check your phone has good signal
- Some carriers may block SMS from unknown numbers
- Try with a different phone number
- Check Twilio console for delivery status

## Free Trial Limitations
Twilio free trial has some limitations:
- Limited credit ($15 usually)
- Can only send to verified phone numbers
- SMS will include "Sent from your Twilio trial account" text

To remove limitations, you need to upgrade to a paid account.

## Current Status
✅ Enhanced OTP service with better error handling
✅ Phone number validation
✅ Detailed logging for debugging
⚠️ Need real Twilio credentials for SMS delivery
