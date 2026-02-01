#!/bin/bash
# Initial setup for mobile platforms
# Run this ONCE from the project root directory

echo "Building web assets first..."
npx vite build

echo ""
echo "Adding iOS platform..."
npx cap add ios

echo ""
echo "Adding Android platform..."
npx cap add android

echo ""
echo "Setup complete!"
echo ""
echo "To build for iOS: ./mobile/build-ios.sh"
echo "To build for Android: ./mobile/build-android.sh"
