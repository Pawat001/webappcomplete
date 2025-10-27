#!/bin/bash
# Novel Similarity Analyzer Frontend Startup Script

echo "🎨 Starting Novel Similarity Analyzer Frontend..."

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Kill any existing processes on port 3000
echo "🧹 Cleaning up port 3000..."
fuser -k 3000/tcp 2>/dev/null || true
pkill -f "wrangler pages dev" 2>/dev/null || true

# Build the project
echo "🔨 Building project..."
npm run build

# Start development server with PM2
echo "🌟 Starting frontend with PM2..."
pm2 delete novel-analyzer-frontend 2>/dev/null || true
pm2 start ecosystem.config.cjs

# Show status
echo "📊 PM2 Status:"
pm2 list

# Test the service
echo "🧪 Testing service..."
sleep 3
curl -s http://localhost:3000 > /dev/null && echo "✅ Frontend is running!" || echo "❌ Frontend failed to start"

echo "🎉 Frontend started successfully!"
echo "🌐 Available at: http://localhost:3000"
echo "📱 Or use: pm2 logs novel-analyzer-frontend --nostream"