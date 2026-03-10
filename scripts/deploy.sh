#!/bin/bash
set -e
echo "🔨 Building..."
npm run build
echo "📦 Staging changes..."
git add .
if git diff --cached --quiet; then
  echo "✅ No changes to deploy."
else
  git commit -m "deploy: $(date +%Y-%m-%d_%H:%M)"
  echo "🚀 Pushing to GitHub..."
  git push origin main
  echo "✅ Deployed! Vercel will auto-deploy from GitHub."
fi
