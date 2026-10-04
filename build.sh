#!/usr/bin/env bash
# Vercel custom build: assemble the plain frontend into a flat static output
# (see vercel.json builds[]). Uploaded from dist/ as real static files.
set -euo pipefail

OUT=dist
rm -rf "$OUT"
mkdir -p "$OUT"

# index.html links these relatively (css/, js/), which resolves from the site root.
cp frontend/index.html "$OUT/index.html"
cp -R frontend/src/css "$OUT/css"
cp -R frontend/src/js "$OUT/js"

# Everything under public/ is served from the site root.
cp -R frontend/public/. "$OUT/"

# Two exclusions, both so the function stays authoritative:
#  - admin/ is served by backend/server.js so the CMS pages keep their no-cache rule.
#  - assets/ holds the bundled resume copy, which backend/routes/resume.routes.js
#    only uses as a fallback; as a static file it would shadow the CMS/Blob version.
rm -rf "$OUT/admin" "$OUT/assets"