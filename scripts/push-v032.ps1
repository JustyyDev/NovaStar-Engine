# NovaStar Engine v0.3.2 - Push to GitHub
# Run this from the novastar-engine folder in PowerShell

# Remove old git history (fresh push pattern)
Remove-Item -Recurse -Force .git -ErrorAction SilentlyContinue

# Init fresh repo
git init
git branch -m main

# Add everything except build artifacts
git add .gitignore
git add LICENSE README.md CHANGELOG.md
git add package.json vite.config.js electron-builder.json
git add index.html editor.html tutorial.html website.html
git add src/
git add electron/
git add scripts/

# Commit
git commit -m "NovaStar Engine v0.3.2 - Full website with community forum, auth, team signups, events calendar, custom SVG illustrations"

# Set remote and push
git remote add origin https://github.com/JustyyDev/NovaStar-Engine.git
git push origin main --force

Write-Host ""
Write-Host "Pushed v0.3.2 to GitHub!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Go to https://github.com/JustyyDev/NovaStar-Engine/releases/new"
Write-Host "2. Tag: v0.3.2"
Write-Host "3. Title: NovaStar Engine v0.3.2"
Write-Host "4. Paste the v0.3.2 section from CHANGELOG.md as the description"
Write-Host "5. Publish release"
Write-Host ""
Write-Host "The auto-updater will pick up the new release automatically." -ForegroundColor Yellow
