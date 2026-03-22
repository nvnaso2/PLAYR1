# iOS App Icons for PLAYR1

These icons are pre-generated and ready to be placed into the Xcode project.

## How to use

After running `npx cap add ios` to create the iOS project, place these icons
into the Xcode asset catalog at:

  ios/App/App/Assets.xcassets/AppIcon.appiconset/

The naming convention maps to Xcode slots as follows:

| File           | Size    | Usage                                 |
|----------------|---------|---------------------------------------|
| icon-20.png    | 20×20   | Notification @1x (iPad)               |
| icon-29.png    | 29×29   | Settings @1x (iPad)                   |
| icon-40.png    | 40×40   | Notification @2x / Spotlight @1x      |
| icon-58.png    | 58×58   | Settings @2x                          |
| icon-60.png    | 60×60   | Notification @3x                      |
| icon-76.png    | 76×76   | iPad App Icon @1x                     |
| icon-80.png    | 80×80   | Spotlight @2x                         |
| icon-87.png    | 87×87   | Settings @3x                          |
| icon-120.png   | 120×120 | App Icon @2x (iPhone) / Spotlight @3x |
| icon-152.png   | 152×152 | iPad App Icon @2x                     |
| icon-167.png   | 167×167 | iPad Pro App Icon @2x                 |
| icon-180.png   | 180×180 | App Icon @3x (iPhone)                 |
| icon-1024.png  | 1024×1024 | App Store listing                   |

Alternatively, run `npx @capacitor/assets generate` after placing
`resources/icon.png` (already done) to have Capacitor auto-populate
all slots.
