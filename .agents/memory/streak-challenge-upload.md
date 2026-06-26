---
name: Streak Challenge video upload
description: How video upload works in the attempt log modal
---
Pattern: POST /api/user/uploads/request-url {name, size, contentType} → {uploadURL, objectPath} → PUT file to uploadURL → store objectPath as videoUrl in attempt.
File input: native <input type="file" accept="video/*"> — no Uppy needed for this flow.
Finalize: /api/uploads/finalize-video can optionally be called after for faststart optimization.

**Why:** ObjectUploader (Uppy DashboardModal) is heavier; native input + presigned PUT is simpler for mobile-first UX.
