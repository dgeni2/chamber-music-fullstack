#!/bin/bash

# Build script for Vercel deployment
# Installs frontend dependencies and builds the Vite app

set -e

cd frontend

echo "Installing frontend dependencies..."
npm ci

echo "Building frontend..."
npm run build

echo "Build complete!"
