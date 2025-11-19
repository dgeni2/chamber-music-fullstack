#!/bin/bash

# Build script for Vercel deployment
# Installs frontend dependencies and builds the Vite app

set -e

echo "Installing frontend dependencies..."
cd frontend
npm ci

echo "Building frontend..."
npm run build

echo "Build complete!"
