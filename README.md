# Clippr

A lightweight, privacy-first Chrome Extension that clips articles from **X (Twitter)** and **LinkedIn** to PDF or Markdown with one click.

## 🚀 Features

- **Multi-Platform Support**: Works on X Articles and LinkedIn Pulse articles
- **1-Click Download**: Icon buttons appear directly in the article header
- **High-Quality PDF**: Clean PDFs with embedded images using `jsPDF`
- **Clean Markdown**: Title, cover image, and full content—ready for AI tools or note-taking
- **Privacy First**: 100% local processing. No servers, no tracking

## 🛠️ Installation

1. Clone or download this repository
2. Open Chrome → `chrome://extensions/`
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** → select the project folder
5. Refresh your X or LinkedIn page

## 📖 Usage

- **X Articles**: Look for the MD and PDF icons in the article header
- **LinkedIn Pulse**: Icons appear near the article title
- Click once → download starts immediately

## 🧠 How It Works

Clippr extracts content directly from the page DOM:
- **X**: Reads from Draft.js editor structure
- **LinkedIn**: Targets `article-content-blocks` container

Images are fetched as base64 and embedded directly into PDFs.

## 📜 License

MIT License
