---
name: iOS web asset syncing
description: Keep the Xcode app bundle aligned with the latest Vite-generated images and web assets.
---

After changing bundled frontend images or other web assets used by the iOS app, run the production build and `npx cap sync ios` before opening the project in Xcode. The Xcode project's `App/public` folder is a copied bundle and can remain stale even when the Replit preview has the new files.

**Why:** Drill and workout images were present in the web build but missing from the iOS app's copied asset folder.

**How to apply:** When native iOS preview assets appear missing, first compare `dist/public/assets` with `ios/App/App/public/assets`; rebuild and sync before debugging image rendering.
