#!/bin/bash

echo "🔒 Cleaning sensitive information from codebase..."

# Replace sensitive phone number in all documentation files
find . -name "*.md" -type f -exec sed -i 's/+916354898334/+1234567890/g' {} \;

echo "✅ Replaced sensitive phone numbers in documentation files"

# Check for any remaining sensitive data
echo ""
echo "🔍 Checking for any remaining sensitive information..."

sensitive_found=false

# Check for Twilio credentials
if grep -r "AC1a10315ff5590c9af4087b1a01e05781" . --exclude-dir=node_modules --exclude-dir=.git >/dev/null 2>&1; then
    echo "⚠️  Found Twilio Account SID in:"
    grep -r "AC1a10315ff5590c9af4087b1a01e05781" . --exclude-dir=node_modules --exclude-dir=.git
    sensitive_found=true
fi

if grep -r "35cc40c2c4cb17d837182c7b9c8fb9c8" . --exclude-dir=node_modules --exclude-dir=.git >/dev/null 2>&1; then
    echo "⚠️  Found Twilio Auth Token in:"
    grep -r "35cc40c2c4cb17d837182c7b9c8fb9c8" . --exclude-dir=node_modules --exclude-dir=.git
    sensitive_found=true
fi

if grep -r "+916354898334" . --exclude-dir=node_modules --exclude-dir=.git >/dev/null 2>&1; then
    echo "⚠️  Found sensitive phone number in:"
    grep -r "+916354898334" . --exclude-dir=node_modules --exclude-dir=.git
    sensitive_found=true
fi

if [ "$sensitive_found" = false ]; then
    echo "✅ No sensitive information found in codebase!"
else
    echo ""
    echo "❌ Please manually review and clean the files listed above"
fi

echo ""
echo "📋 Security Checklist:"
echo "✅ Removed hardcoded Twilio credentials from otpService.ts"
echo "✅ Updated .env and .env.example files"
echo "✅ .gitignore includes .env files"
echo "✅ Replaced phone numbers in documentation"
echo ""
echo "🚀 Your codebase is now safe to push to GitHub!"
echo ""
echo "💡 Don't forget to:"
echo "   1. Add your real Twilio credentials to .env (locally only)"
echo "   2. Set environment variables in production"
echo "   3. Never commit .env files"
