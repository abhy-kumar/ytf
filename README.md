# YTF (YouTube Free) Desktop

YTF Desktop is a highly optimized, ad-free, and privacy-respecting YouTube client for Windows. Built for performance and portability, it completely avoids heavy web engines by leveraging native system capabilities.

## 🎯 Goal of the App

The primary goal of YTF Desktop is to provide a pristine, 1080p, ad-free YouTube experience in a truly lightweight, standalone application. 
Unlike official YouTube clients or bloated Electron-based wrappers that consume significant RAM and aggressively cache data, YTF is designed to be lean. It targets users who want a simple, beautiful interface to follow their favorite subscriptions and watch videos seamlessly without accounts, trackers, or interruptions.

## ✨ Features

- **Zero Ads, Zero Tracking:** Uses natively ad-free 1080p embeds via [Piped.video](https://piped.video/), meaning you never have to deal with pre-roll ads, mid-roll interruptions, or complex ad-blocking extensions.
- **Account-Free Subscriptions:** Subscribe to YouTube channels directly within the app using their Channel IDs. The app fetches data securely via RSS feeds without requiring a Google Account.
- **Portable Executable:** The entire application is compiled into a single, standalone `.exe` file. No messy installers or complex setups required.
- **Ultra-Lightweight:** Built with Tauri and native Windows WebView2, consuming a fraction of the RAM and CPU compared to standard Electron apps or Google Chrome.
- **Persistent Watch History:** The app locally remembers your watch progress, allowing you to seamlessly pick up where you left off if interrupted.
- **Beautiful UI:** Features a modern, glassmorphism-inspired interface with fluid micro-animations for a premium feel.

## 🛠️ Technology Stack

- **Backend:** Rust / [Tauri v2](https://v2.tauri.app/) (For high performance and system-level file access).
- **Frontend:** React + TypeScript + Vite.
- **Styling:** Custom Vanilla CSS utilizing modern CSS variables and glassmorphism.
- **Video Delivery:** Privacy-respecting frontend API via Piped.
- **CI/CD:** Automated builds using GitHub Actions to output the portable `.exe`.

## 🚀 Getting Started

Since YTF is a portable app, installation is simple:
1. Head over to the **Actions** tab of this repository.
2. Click on the latest successful "Build Portable Tauri App" workflow run.
3. Scroll down to the **Artifacts** section and download the `YTF-Portable-Windows` `.zip` file.
4. Extract the folder and double-click `ytf.exe` to launch the app!

*(Note: Windows SmartScreen may flag the executable since it is not digitally signed by a paid publisher. You can click "More info" and "Run anyway").*

## 🔮 Possible Improvements

While fully functional, YTF has several avenues for future enhancement:
- **Search Functionality:** Implementing an Invidious or Piped API integration to allow searching for videos globally rather than relying strictly on channel RSS subscriptions.
- **Subscription Import:** Adding a feature to parse and import a Google Takeout `.csv` or `.opml` file so users can instantly bring over their existing YouTube subscriptions.
- **SponsorBlock Integration:** Automatically skipping in-video sponsor segments, intros, and outros for an even cleaner viewing experience.
- **Cross-Platform Builds:** Extending the GitHub Actions pipeline to compile `.dmg` (macOS) and `.AppImage` (Linux) portable binaries.
- **Download for Offline Viewing:** Utilizing the backend Rust environment and `yt-dlp` to allow users to save 1080p MP4s directly to their hard drive.

## 📝 License
This project is open source and designed for personal use.
