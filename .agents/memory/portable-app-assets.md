---
name: Portable app assets
description: Keep frontend assets imported by app code in tracked source directories so local Git clones can build.
---

Place app-required images and other frontend assets in a tracked source folder such as `client/src/assets`, rather than `attached_assets`. In this environment, `attached_assets/*` is globally ignored and files added there may exist in the Replit workspace but be missing from a user's local Git clone.

**Why:** Capacitor's local web build failed because a frontend import referenced a generated image from `attached_assets`, which was absent on the user's Mac.

**How to apply:** Before using a file from `attached_assets` in runtime code, check whether it is tracked. If it is ignored, move/copy it into a source-controlled asset folder and update the import before asking the user to build or sync locally.
