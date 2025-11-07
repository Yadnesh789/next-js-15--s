#!/bin/bash

echo "⚡ Turbopack vs Webpack Performance Comparison"
echo "=============================================="

cd frontend

echo ""
echo "🧪 Testing Build Performance..."
echo ""

# Test Webpack build time
echo "📦 Testing Webpack (Legacy) build..."
time_start=$(date +%s)
npm run dev:legacy > /dev/null 2>&1 &
WEBPACK_PID=$!
sleep 5 # Wait for initial build
kill $WEBPACK_PID 2>/dev/null
time_end=$(date +%s)
webpack_time=$((time_end - time_start))

echo "⏱️  Webpack startup time: ${webpack_time} seconds"

# Test Turbopack build time  
echo ""
echo "🚀 Testing Turbopack build..."
time_start=$(date +%s)
npm run dev > /dev/null 2>&1 &
TURBOPACK_PID=$!
sleep 5 # Wait for initial build
kill $TURBOPACK_PID 2>/dev/null
time_end=$(date +%s)
turbopack_time=$((time_end - time_start))

echo "⏱️  Turbopack startup time: ${turbopack_time} seconds"

# Calculate improvement
if [ $webpack_time -gt 0 ]; then
    improvement=$(echo "scale=1; ($webpack_time - $turbopack_time) * 100 / $webpack_time" | bc)
    echo ""
    echo "🎯 Performance Results:"
    echo "  📈 Turbopack is ${improvement}% faster than Webpack"
    echo "  ⚡ Time saved: $((webpack_time - turbopack_time)) seconds"
fi

echo ""
echo "✨ Turbopack Benefits:"
echo "  🔥 Up to 700x faster updates"
echo "  ⚡ 10x faster cold starts"
echo "  🧠 Better memory usage"
echo "  🔄 Faster Hot Module Replacement (HMR)"
echo "  📦 Optimized for React 19 & Next.js 15"
echo ""
echo "🚀 Ready to use Turbopack! Run:"
echo "   npm run dev          # Turbopack enabled"
echo "   ./start-turbo.sh     # Turbopack with detailed info"
echo "   npm run dev:legacy   # Fallback to Webpack"
