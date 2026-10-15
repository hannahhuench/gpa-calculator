# GPA Predictor (PWA)

Dark-themed, offline-capable GPA predictor for the 4.3 scale. No build step, no backend.

## Run locally
    npx serve .        # or: python3 -m http.server 8000

## Test
    npm test           # 45 tests: calculation logic + UI behaviour + PWA file checks

## Deploy on GitHub Pages
1. Push this folder's contents to a GitHub repo (index.html at the repo root).
2. Settings > Pages > Deploy from branch > main / (root).
3. Open https://USERNAME.github.io/REPO/ and use "Add to Home Screen".

## Updating after deploy
Change `CACHE = "gpa-v1"` in sw.js to a new value (gpa-v2, ...) so installed copies refresh.

## Notes
- Default grade cutoffs are a template. Each subject sets its own; edit them per subject.
- Data is stored in the browser (localStorage). Use Export/Import to back up or move devices.
