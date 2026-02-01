# App Icons

## Required Icon

You need a single 1024x1024 PNG image as your app icon. This will be used to generate all required sizes for iOS and Android.

### Recommendations:
- Use a simple, recognizable design (e.g., a basketball with the Handlz logo)
- Avoid text that's too small to read at small sizes
- Use solid colors rather than gradients
- Ensure the icon looks good on both light and dark backgrounds

## Generating All Icon Sizes

1. **Create your 1024x1024 icon** and save it as `mobile/icons/app-icon.png`

2. **Use an online generator:**
   - Go to [appicon.co](https://www.appicon.co/)
   - Upload your 1024x1024 icon
   - Select both iOS and Android
   - Download the generated assets

3. **Copy the generated icons:**

   **For iOS:**
   Copy the contents to: `ios/App/App/Assets.xcassets/AppIcon.appiconset/`

   **For Android:**
   Copy the mipmap folders to: `android/app/src/main/res/`

## Splash Screen

The splash screen is configured in `capacitor.config.ts` with a dark background (#0a0a0a).

To add a splash screen image:

1. Create a splash image (2732x2732 for full support)
2. Place it at:
   - iOS: `ios/App/App/Assets.xcassets/Splash.imageset/`
   - Android: `android/app/src/main/res/drawable/splash.png`

## Current Handlz Assets

The following Handlz images are available in `attached_assets/` that could be used as a base:
- `Handlz_(26)_1769377307158.png` - Handlz logo
- `Handlz_Box_1769377307157.png` - Box design
- `Handlz_Landscape_1769377307158.png` - Landscape logo

Consider using the Handlz logo or creating a simplified basketball icon for the app.
