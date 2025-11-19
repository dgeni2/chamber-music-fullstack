#!/bin/bash

# Build script for Vercel deployment
# Installs frontend dependencies and builds the Vite app

set -e

echo "Installing frontend dependencies..."
cd frontend
npm ci

echo "Building frontend..."
PATH="./node_modules/.bin:$PATH" vite build

echo "Build complete!"
