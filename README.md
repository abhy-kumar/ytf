<div align="center">
  <img src="app-icon.svg" width="128" height="128" alt="YTF Icon" />
  <h1>YTF Desktop</h1>
</div>

YTF Desktop is a highly optimized, ad-free, and privacy-respecting YouTube client for Windows. Built for performance and portability, it completely avoids heavy web engines by leveraging native system capabilities.

## Goal of the App

The primary goal of YTF Desktop is to provide a pristine, 1080p, ad-free YouTube experience in a truly lightweight, standalone application. 
Unlike official YouTube clients or bloated Electron-based wrappers that consume significant RAM and aggressively cache data, YTF is designed to be lean. It targets users who want a simple, beautiful interface to follow their favorite subscriptions and watch videos seamlessly without accounts, trackers, or interruptions.

## Features

- **Zero Ads, Zero Tracking:** Uses natively ad-free 1080p embeds via [Piped.video](https://piped.video/), meaning you never have to deal with pre-roll ads or complex ad-blocking extensions.
- **SponsorBlock Integration:** Automatically skips in-video sponsor segments, intros, and outros for an even cleaner viewing experience.
- **Account-Free Subscriptions:** Subscribe to YouTube channels directly within the app using their Channel IDs. 
- **Subscription Import:** Easily parse and import a Google Takeout `.csv` file to instantly bring over all your existing YouTube subscriptions.
- **Global Search:** Built-in search functionality using the Piped API to discover and watch new videos outside your subscriptions.
- **Offline 1080p Downloads:** Utilizing a bundled native `yt-dlp` backend engine to allow users to save MP4 videos directly to their hard drive with one click.
- **Persistent Watch History:** The app locally remembers your watch progress, allowing you to seamlessly pick up where you left off if interrupted.
- **Portable & Multi-Platform:** The application is compiled into a standalone binary for Windows, macOS, and Linux. No messy installers required.
- **Ultra-Lightweight:** Built with Tauri and native OS webviews, consuming a fraction of the RAM and CPU compared to standard Electron apps or Google Chrome.

## Technology Stack

- **Backend:** Rust / [Tauri v2](https://v2.tauri.app/) (For high performance and system-level file access).
- **Frontend:** React + TypeScript + Vite.
- **Styling:** Custom Vanilla CSS utilizing modern CSS variables and glassmorphism.
- **Video Delivery:** Privacy-respecting frontend API via Piped.
- **CI/CD:** Automated multi-OS builds using GitHub Actions that publish directly to GitHub Releases.

## Getting Started

Since YTF is a portable app, installation is simple:
1. Head over to the **Releases** tab on the right side of this repository.
2. Download the latest executable for your operating system (e.g., `YTF-Windows.zip`).
3. Extract the folder and launch the application!

*(Note: Windows SmartScreen or macOS Gatekeeper may flag the executable since it is not digitally signed by a paid publisher. You can safely bypass this to run the app).*

## Possible Improvements

While heavily featured, YTF has a few avenues for future enhancement:
- **OPML Support:** Extending the import system to handle `.opml` files.
- **Categorization:** Grouping subscriptions into custom folders or tags.

## License
This project is open source and designed for personal use.
