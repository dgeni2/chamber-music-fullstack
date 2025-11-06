#!/bin/bash
# HarmonyForge Unified Server Startup Script

set -e

echo "🎵 Starting HarmonyForge Unified Server..."
echo ""

# Navigate to project root
cd "$(dirname "$0")"

# Step 1: Build frontend
echo "📦 Building frontend..."
cd frontend
npm run build
cd ..

# Step 2: Start backend (which serves frontend)
echo "🚀 Starting server on http://localhost:3001..."
cd backend
npx tsx src/server.ts
