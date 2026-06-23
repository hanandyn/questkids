# FunDo Frontend

React + TypeScript + Vite web app, packaged for native Android/iOS with Capacitor.

## Web

```bash
npm install
npm run dev
npm run build
npm run preview
```

## Native

```bash
npm run native:sync
npm run native:android
npm run native:ios
```

`native:sync` builds `dist/` and copies the production web bundle into the native shells under `android/` and `ios/`.

Android builds require Android Studio. iOS builds require Xcode on macOS.

## Responsive Checks

```bash
npm run test:e2e
```

The Playwright suite runs against a local preview server by default and includes phone, tablet, desktop, and wide viewport smoke checks.
