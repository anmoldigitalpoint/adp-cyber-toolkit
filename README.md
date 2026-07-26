# ANMOL DIGITAL POINT — ADP Digital Suite

India's Smart Cyber Cafe Toolkit. Pure HTML/CSS/JavaScript, runs entirely in the browser (no server, no backend needed).

## 1. Deploy on GitHub Pages

1. Create a new GitHub repository (e.g. `adp-digital-suite`).
2. Upload every file/folder in this project, keeping the same structure:
   ```
   index.html, privacy.html, disclaimer.html, offline.html
   manifest.json, service-worker.js
   css/style.css
   js/*.js
   assets/icons/*.png
   ```
3. Go to your repo → **Settings → Pages** → set **Source** to your main branch, root folder.
4. Your site goes live at `https://<your-username>.github.io/<repo-name>/`.

## 2. "Install as an app" (PWA) — no Play Store needed

This site is already a full **Progressive Web App**:
- `manifest.json` + `service-worker.js` make it installable.
- On Android Chrome, visitors get an automatic "Install" banner, or can use the ⬇️ icon in the navbar / browser menu → **Add to Home Screen / Install App**.
- Once installed, it opens full-screen like a native app, with its own icon, and works offline for any tool already opened before.
- On iPhone (Safari), visitors use **Share → Add to Home Screen**.

This is the most reliable, zero-cost way to give people an "app" experience from a GitHub Pages site.

## 3. If you specifically want a Play Store `.apk` / `.aab`

A PWA can be wrapped into a real installable Android package **without rewriting any code**, using either:
- **PWABuilder** (pwabuilder.com) — paste your live GitHub Pages URL, it reads your `manifest.json` and generates a signed `.apk`/`.aab` you can upload to the Play Store.
- **Bubblewrap** (Google's official CLI, `npm install -g @bubblewrap/cli`) — same idea, run locally.

Both tools just wrap your existing site in a "Trusted Web Activity" shell — your HTML/CSS/JS above doesn't need to change. This step needs to happen after the site is live on a public HTTPS URL (GitHub Pages qualifies).

## 4. What's fully working vs. coming soon

Every tool card that is **not** marked "Coming Soon" is fully functional and does real client-side processing (no fake buttons). Two exceptions are intentionally marked "Coming Soon" rather than shipped half-working:
- **Background Remover** — needs an AI segmentation model; not something that can be done reliably with plain Canvas code.
- **Protect PDF / Unlock PDF** — real password encryption needs a proper crypto library integration we haven't verified yet; safer to hold back than ship unreliable password protection.

Everything else — PDF tools, image tools, the Multi Document Scanner (auto-crop + merge to PDF), Smart ID Card Auto Print, Passport Photo Maker, Resume Builder (3 templates), QR/Barcode tools, and all Utility tools — works today, fully in the browser.
