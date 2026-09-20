# Proton Mail Desktop (lightweight Electron wrapper)

- Frameless window with a slim carbon-themed top bar: **minimize · fullscreen · exit**
  (drag the bar to move the window, double-click to maximize, `F11` toggles fullscreen)
- Modern slim scrollbar injected into Proton Mail (and its iframes)
- Your icon (`build/icon.ico`, `build/icon.png`, `assets/icon.png`)
- No runtime dependencies, no menu bar, single instance, remembers window size
- External links open in your default browser; `proton.me` / `proton.ch` stay in-app
- Extra shortcuts: `Ctrl+R` reload, `Ctrl+Shift+R` hard reload, `Ctrl +/-/0` zoom

## Run
    npm install
    npm start

## Build the installer
    npm run dist:win     # Windows NSIS installer  -> dist/ProtonMail-Setup-1.0.0.exe
    npm run dist:linux   # AppImage + .deb
    npm run dist:mac     # .dmg (must be run on macOS)

Windows installers should be built on Windows (or Linux with Wine). Alternatively push to GitHub and run the
**Build installers** workflow (`.github/workflows/build.yml`) to get all three from CI.

## Configure
- Start URL: edit `START_URL` in `main.js` (currently `https://mail.proton.me`)
  or set the `PROTON_URL` environment variable.
- Colors: `--bg` etc. in `renderer/topbar.html`; scrollbar look in `content-preload.js`.
- Bar height: `TOPBAR_HEIGHT` in `main.js` and `--bar-h` in `renderer/topbar.html` (keep them equal).
