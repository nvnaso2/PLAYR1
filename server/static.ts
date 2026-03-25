import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Serve hashed static assets (JS/CSS/fonts) with long-term immutable caching.
  // These files are content-hashed by Vite so their filename changes whenever
  // their content changes — safe to cache forever.
  app.use(
    express.static(distPath, {
      index: false, // never auto-serve index.html here; we handle it below
      setHeaders: (res, filePath) => {
        if (/\.(js|css|woff2?|ttf|otf|eot)(\?.*)?$/.test(filePath)) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
      },
    }),
  );

  // index.html must NEVER be cached — it references hashed asset filenames, so
  // any cached copy will load stale JS/CSS bundles after a deployment.
  // This is the primary reason iOS WKWebView (Capacitor) shows old code after
  // publishing: it serves the cached index.html which points to old bundles.
  app.use("/{*path}", (_req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
