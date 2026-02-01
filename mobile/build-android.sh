#!/bin/bash
# Build script for Android
# Run this from the project root directory

echo "Building web assets..."
npx vite build

echo "Syncing with Android..."
npx cap sync android

echo "Opening Android Studio..."
npx cap open android

echo ""
echo "Next steps in Android Studio:"
echo "1. Wait for Gradle sync to complete"
echo "2. Click 'Build' > 'Build Bundle(s) / APK(s)' > 'Build APK(s)'"
echo "3. Find APK in: android/app/build/outputs/apk/debug/app-debug.apk"
