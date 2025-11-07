#!/bin/bash

echo "⚡ Turbopack Status Check"
echo "========================"

cd frontend

# Check if Turbopack is enabled in package.json
if grep -q "next dev --turbo" package.json; then
    echo "✅ Turbopack enabled in package.json"
else
    echo "❌ Turbopack not found in package.json"
fi

# Check Next.js version
NEXT_VERSION=$(npm list next --depth=0 2>/dev/null | grep next@ | sed 's/.*next@//' | sed 's/ .*//')
echo "📦 Next.js version: $NEXT_VERSION"

# Check if turbopack config exists
if [ -f "next.config.js" ] && grep -q "turbopack" next.config.js; then
    echo "✅ Turbopack configuration found in next.config.js"
else
    echo "⚠️  No Turbopack configuration in next.config.js"
fi

# Check for turbo.json
if [ -f "../turbo.json" ]; then
    echo "✅ Turbo repository configuration found"
else
    echo "⚠️  No turbo.json found"
fi

echo ""
echo "🚀 Available Commands:"
echo "  npm run dev          - Start with Turbopack (default)"
echo "  npm run dev:legacy   - Start with Webpack (fallback)"
echo "  npm run build        - Build with optimizations"
echo "  npm run turbo        - Explicit Turbopack command"
echo "  ./start-turbo.sh     - Enhanced Turbopack startup"
echo ""

# Test if server is running
if curl -s http://localhost:3000 >/dev/null; then
    echo "🌐 Development server is running at http://localhost:3000"
    echo "⚡ Check browser console for 'Turbopack' indicators"
else
    echo "🔄 Development server not running. Start with: npm run dev"
fi

echo ""
echo "✨ Turbopack Benefits in your app:"
echo "  🔥 700x faster Hot Module Replacement"
echo "  ⚡ 10x faster cold starts"
echo "  🧠 Optimized memory usage"
echo "  📦 Better package imports (antd, icons)"
echo "  🚀 Ready for production builds"
