# X Article PDF/Markdown Downloader

A lightweight, local-first Chrome Extension that lets you download X (formerly Twitter) Articles as high-quality PDF or Markdown with just one click. Perfect for saving long-form content for research, personal archives, or feeding into AI tools like Claude and ChatGPT.

## 🚀 Features

- **1-Click Download**: Integrated icon buttons directly in the X Article header and your timeline cards.
- **High-Quality PDF**: Generates clean PDFs with embedded images and headers using `jsPDF`—no browser "print to PDF" manual steps required.
- **Clean Markdown**: Captures the title, cover image, and full content blocks for seamless use in document editors or AI notes.
- **Privacy First**: Everything runs on your device. No external servers, no AI scrapers, no account tracking.
- **Native Look & Feel**: Minimalist icons that blend perfectly with X’s design system.

## 🛠️ Installation

1. Clone or download this repository.
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked**.
5. Select the `x_articles_pdf` folder.
6. Refresh your X (Twitter) page.

## 📖 Usage

- **On an Article Page**: Look for the small Markdown (M↓) and PDF icons in the top-right corner of the article header, next to the expand icon. 1-click and the download starts immediately.
- **In the Feed**: Encountered an article card while scrolling? Click the download icon on the card to quickly navigate and extract.

## 🧠 Technical Details

This extension extracts content directly from the X Draft.js editor structure. It retrieves text blocks and relative media URLs, then reconstructs the document locally. Images are fetched as base64 to ensure they are embedded directly into the generated PDF.

## 📜 License

MIT License. Feel free to use, modify, and share!
