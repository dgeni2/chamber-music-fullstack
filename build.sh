#!/bin/bash

# Build script for Vercel deployment
# Installs frontend dependencies and builds the Vite app

set -e

echo "Installing frontend dependencies..."
cd frontend
npm ci

echo "Building frontend..."
node node_modules/vite/bin/vite.js build

echo "Build complete!"
