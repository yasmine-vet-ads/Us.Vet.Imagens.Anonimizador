All fixtures are synthetic. No clinical images are used.

From browser-poc (PowerShell), with Node 22+ and Python 3.12:

```powershell
npm ci
npm run build
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r tests/requirements-reference.txt
.\.venv\Scripts\python.exe tests/fixtures.py
.\.venv\Scripts\python.exe tests/fixtures_extra.py
npm test
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path (Get-Location) 'tests/generated/browsers'
npx playwright install chromium firefox
npm run test:browser
node tests/browser.mjs --extras
npm run test:stress
.\.venv\Scripts\python.exe tests/verify_exports.py
.\.venv\Scripts\python.exe tests/verify_exports.py --stress
.\.venv\Scripts\python.exe tests/visual_comparison.py
node scripts/audit.mjs
```

Chrome and Edge use installed stable channels. If Chrome is unavailable, use `POC_CHROMIUM=1` to use the downloaded Chromium. Firefox is the pinned Playwright build. Set `POC_BROWSER=Chrome`, `Edge`, or `Firefox` to select a single engine.

The static server is started/stopped by the browser test on port 4173: stop any manually started POC server first. Normal browser gates run all original fixtures and the 1600×1200 1/5/10 corpus in all three modes. `--extras` runs additional PNG depths/Adam7, a larger Gaussian kernel, actual APNG, native canvas encoding inspection, forced canvas fallback and EXIF orientation probing. `--stress` runs 1/5/10 × 4000×3000, using the default black mask; stress is recorded separately.

Reports, downloaded ZIPs, visual comparisons and screenshots go to `tests/artifacts/` (ignored). The initial reports copied to `docs/anonymizer-client-poc-evidence/` are reviewable evidence; they contain only synthetic fixture names.

Browser privacy tests install instrumentation in the page AND Worker for fetch, XHR, sendBeacon, WebSocket and FormData; route interception covers all network requests. Only startup GETs for static assets are allowed. After the Worker is ready the browser goes offline. Any attempted processing request or instrumentation call fails the test. The test exercises selection, real Worker processing, review and ZIP download.

Timers measure main-thread scheduling delay; Chromium exposes main JS heap only. These do not measure process RSS, image decoder native memory, GPU buffers, all Workers, or Blob backing stores. Mobile viewport screenshots are layout tests, not Android/iOS memory certification.

Quantitative thresholds set before GO: normalized PNG/black masks exact; PNG blur/pixel max <=2, mean <=0.5; JPEG decoder max <=3, mean <=0.5; combined JPEG decoder + masking pipeline max <=5, mean <=0.7. Border error is logged separately. Visual inspection remains required.
