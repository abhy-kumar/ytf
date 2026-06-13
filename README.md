<div align="center">
  <img src="app-icon.svg" width="128" height="128" alt="YTF Icon" />
  <h1>YTF Desktop</h1>
</div>

YTF Desktop is a highly optimized, ad-free, and privacy-respecting YouTube client for Windows. Built for absolute reliability and performance, it leverages native system capabilities and the power of `yt-dlp` to bypass restrictive third-party APIs.

## Features

- **Native Extraction Engine:** Completely independent of fragile iframe embeds like `piped.video`. YTF uses the bundled `yt-dlp` engine to securely extract direct, high-quality `.mp4` streams straight from YouTube and play them natively.
- **Zero Ads, Zero Tracking:** Enjoy a pristine, ad-free 1080p viewing experience natively, without relying on ad-blockers.
- **Bulletproof Search:** Searches fall back dynamically through various privacy-respecting Invidious APIs. If all public APIs fail, it silently drops down to a native `yt-dlp` search directly against YouTube. Your search will *never* break.
- **Frictionless Subscriptions:** Subscribe to channels simply by pasting their YouTube URL, `@handle`, or Channel ID. YTF automatically scans and resolves handles natively.
- **Subscription Import:** Easily parse and import a Google Takeout `.csv` file to instantly bring over all your existing YouTube subscriptions.
- **Offline 1080p Downloads:** One-click saving of highest quality MP4 videos straight to your hard drive.
- **Persistent Watch History:** The app locally remembers your precise watch progress, automatically saving every 5 seconds.
- **Ultra-Lightweight:** Built with Tauri and native OS webviews, consuming a fraction of the RAM and CPU compared to standard Electron apps.

## Technology Stack

- **Backend:** Rust / [Tauri v2](https://v2.tauri.app/) (For high performance and system-level file access).
- **Core Engine:** Bundled `yt-dlp` sidecar for stream extraction, search fallbacks, and downloads.
- **Frontend:** React + TypeScript + Vite.
- **Styling:** Custom Vanilla CSS featuring the unique "Aurora Noir" aesthetic.
- **CI/CD:** Automated multi-OS builds using GitHub Actions that publish directly to GitHub Releases.

## Getting Started

Since YTF is a portable app, installation is simple:
1. Head over to the **Releases** tab on the right side of this repository.
2. Download the latest executable for your operating system (e.g., `YTF-Windows.zip`).
3. Extract the folder and launch the application!

*(Note: Windows SmartScreen or macOS Gatekeeper may flag the executable since it is not digitally signed by a paid publisher. You can safely bypass this to run the app).*

## License
This project is open source and designed for personal use.
