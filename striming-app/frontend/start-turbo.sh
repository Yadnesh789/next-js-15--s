#!/bin/bash

echo "🚀 Starting Next.js 15 with Turbopack (Stable)"
echo "=============================================="

# Check if we're in the frontend directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Are you in the frontend directory?"
    exit 1
fi

# Check if Next.js 15+ is installed
NEXT_VERSION=$(npm list next --depth=0 2>/dev/null | grep next@ | sed 's/.*next@//' | sed 's/ .*//')
echo "📦 Next.js version: $NEXT_VERSION"

if [[ $NEXT_VERSION < "15.0.0" ]]; then
    echo "⚠️  Warning: Turbopack is stable in Next.js 15+. Current version: $NEXT_VERSION"
fi

# Set Turbopack environment variables
export TURBOPACK=1
export NEXT_PRIVATE_TURBOPACK=1

echo ""
echo "⚡ Turbopack Features Enabled:"
echo "  ✅ Fast Refresh with Turbopack"
echo "  ✅ Optimized package imports (antd, @ant-design/icons)"
echo "  ✅ Server Components optimization"
echo "  ✅ Filesystem caching"
echo "  ✅ Enhanced CSS processing"
echo ""

# Start development server with Turbopack
echo "🔥 Starting development server with Turbopack..."
echo "   Frontend will be available at: http://localhost:3000"
echo ""

# Run with Turbopack
npm run dev
