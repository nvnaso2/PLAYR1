#!/bin/bash
# Build script for iOS (requires Mac with Xcode)
# Run this from the project root directory

echo "Building web assets..."
npx vite build

echo "Syncing with iOS..."
npx cap sync ios

echo "Opening Xcode..."
npx cap open ios

echo ""
echo "Next steps in Xcode:"
echo "1. Select your development team in Signing & Capabilities"
echo "2. Connect your iPhone or select a simulator"
echo "3. Click the Play button to build and run"
echo "4. For TestFlight: Product > Archive"
