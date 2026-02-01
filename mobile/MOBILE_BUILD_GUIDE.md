# Handlz Training - Mobile App Build Guide

This guide explains how to build the Handlz Training app for iOS and Android using Capacitor.

## Prerequisites

### For Android
- **Android Studio** (free) - [Download](https://developer.android.com/studio)
- **Google Play Developer Account** ($25 one-time) - For publishing to Play Store

### For iOS
- **Mac computer** (required - iOS apps cannot be built on Windows/Linux)
- **Xcode** (free from Mac App Store)
- **Apple Developer Account** ($99/year) - For TestFlight and App Store

## Initial Setup (One Time)

1. **Clone/download the project to your local machine**

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the setup script:**
   ```bash
   ./mobile/setup.sh
   ```
   
   This will:
   - Build the web assets
   - Add iOS and Android platforms

## Building for Android

1. **Run the Android build script:**
   ```bash
   ./mobile/build-android.sh
   ```

2. **In Android Studio:**
   - Wait for Gradle sync to complete
   - Click **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**
   - Find your APK at: `android/app/build/outputs/apk/debug/app-debug.apk`

3. **To test on a device:**
   - Enable "Install from unknown sources" on your Android phone
   - Transfer and install the APK

4. **For Google Play:**
   - Create a signed release build in Android Studio
   - Upload to Google Play Console

## Building for iOS

1. **Run the iOS build script:**
   ```bash
   ./mobile/build-ios.sh
   ```

2. **In Xcode:**
   - Select your Apple Developer team in **Signing & Capabilities**
   - Connect your iPhone or select a simulator
   - Click the **Play** button to build and run

3. **For TestFlight (beta testing):**
   - In Xcode: **Product** > **Archive**
   - Upload to App Store Connect
   - Add testers in TestFlight section

## Updating the App

After making changes to the web app:

```bash
# Build web assets and sync to mobile
npx vite build
npx cap sync
```

Then rebuild in Xcode/Android Studio.

## App Configuration

The app is configured in `capacitor.config.ts`:

- **App ID:** `com.handlz.training`
- **App Name:** `Handlz Training`
- **Splash Screen:** Dark background (#0a0a0a)

## Customizing Icons

Replace the following files with your own icons:

### Android
- `android/app/src/main/res/mipmap-*/ic_launcher.png`
- Sizes: 48x48, 72x72, 96x96, 144x144, 192x192

### iOS
- `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
- Sizes: Multiple sizes from 20x20 to 1024x1024

**Tip:** Use a tool like [App Icon Generator](https://www.appicon.co/) to generate all sizes from a single 1024x1024 image.

## Troubleshooting

### "Command not found: cap"
Run `npm install` to ensure Capacitor CLI is installed.

### iOS build fails with signing error
Make sure you've selected your development team in Xcode's Signing & Capabilities.

### Android build fails with SDK error
Open Android Studio and let it install any missing SDK components.

### App shows blank screen
1. Check that `dist/public` folder exists (run `npx vite build`)
2. Run `npx cap sync` to copy web assets to mobile

## API Configuration

The mobile app connects to your backend API. For production:

1. Update `capacitor.config.ts` to set your production server URL:
   ```typescript
   server: {
     url: 'https://your-production-url.replit.app',
     cleartext: false,
   }
   ```

2. Rebuild and sync:
   ```bash
   npx vite build && npx cap sync
   ```

## Support

For issues with:
- **Capacitor:** [capacitorjs.com/docs](https://capacitorjs.com/docs)
- **Android builds:** [developer.android.com](https://developer.android.com)
- **iOS builds:** [developer.apple.com](https://developer.apple.com)
