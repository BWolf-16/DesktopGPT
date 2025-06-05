# 🖥️ DesktopGPT

**DesktopGPT** is a lightweight desktop client for ChatGPT, built using Electron. It brings the power of GPT directly to your desktop in a clean and minimal interface — no browser required.

---

## 🚀 Features

- 💬 Chat with GPT models in a native desktop window
- 🪟 Electron-powered for cross-platform use (Windows, macOS, Linux)
- 🧠 OpenAI API-ready (can be extended with your own keys)
- 🔒 Local execution — no telemetry, no tracking
- 🧰 Small and hackable codebase, perfect for customizing

---

## 🛠️ Getting Started

### Prerequisites
- Node.js (v16+ recommended)
- npm

### Installation

1. Clone this repo:
   ```bash
   git clone https://github.com/BWolf-16/DesktopGPT.git
   cd DesktopGPT
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the app:
   ```bash
   npm start
   ```

> You now have your own ChatGPT app running natively!

---

## 🧪 File Structure

| File                 | Description                    |
|----------------------|--------------------------------|
| `main.js`            | Main Electron process          |
| `preload.js`         | Preload script for window logic |
| `package.json`       | App config and metadata        |
| `assets/`            | Icons for your app             |

---

## 📦 Packaging (Optional)

To package the app for distribution (using `electron-packager`, `electron-builder`, or similar), install the required tool and follow their instructions.

---

## 🐾 License

> I don’t believe in copyrights.  
> Do whatever you want with it.  
> I take **zero responsibility** for your actions.