# Desktop GPT

A modern desktop application for ChatGPT with native system integration, built with Electron.

![Desktop GPT Screenshot](assets/screenshot.png)

## ✨ Features

### 🖥️ **Native Desktop Experience**
- **System Tray Integration** - Minimize to tray and quick access
- **Window State Persistence** - Remembers size, position, and state
- **Always on Top** - Keep the window above other applications
- **Focus Mode** - Distraction-free fullscreen experience

### ⌨️ **Keyboard Shortcuts**
- `Ctrl+Shift+G` - Toggle window visibility (global)
- `Ctrl+Shift+N` - Start new chat (global)
- `Ctrl+N` - New chat (in-app)
- `Ctrl+H` - Hide to tray
- `F11` - Toggle focus mode
- `Ctrl+/` - Show keyboard shortcuts help

### 🔔 **Smart Notifications**
- Welcome notification on startup
- Update notifications with click-to-install
- Tray minimize notifications (Windows)

### 🔄 **Auto-Updates**
- Automatic background updates
- Native installer for easy distribution
- Cross-platform support (Windows, macOS, Linux)

### 🛡️ **Enhanced Security**
- Persistent login sessions
- Secure external link handling
- Permission management for notifications and microphone

### 🌐 **Connectivity Features**
- Offline/online detection
- Automatic reconnection
- Error recovery with retry functionality

## 📦 Installation

### Windows
1. Download the latest `Desktop-GPT-Setup.exe` from [Releases](https://github.com/yourusername/DesktopGPT/releases)
2. Run the installer and follow the setup wizard
3. Choose installation directory and create shortcuts
4. Launch Desktop GPT from Start Menu or Desktop

### macOS
1. Download the latest `Desktop-GPT.dmg` from [Releases](https://github.com/yourusername/DesktopGPT/releases)
2. Open the DMG file
3. Drag Desktop GPT to Applications folder
4. Launch from Applications or Spotlight

### Linux
Choose your preferred package format:

**AppImage (Universal)**
```bash
# Download and make executable
chmod +x Desktop-GPT-*.AppImage
./Desktop-GPT-*.AppImage
```

**Debian/Ubuntu (.deb)**
```bash
sudo dpkg -i Desktop-GPT-*.deb
sudo apt-get install -f  # Fix dependencies if needed
```

**RedHat/Fedora (.rpm)**
```bash
sudo rpm -i Desktop-GPT-*.rpm
```

## 🚀 Quick Start

1. **First Launch**: Desktop GPT will show a welcome notification
2. **Login**: Use your OpenAI account credentials in the ChatGPT interface
3. **System Tray**: Click the tray icon to show/hide the window
4. **Global Access**: Use `Ctrl+Shift+G` from anywhere to toggle the window

## ⚙️ Configuration

### System Tray
- **Left Click**: Toggle window visibility
- **Right Click**: Access context menu with quick actions

### Menu Options
- **File Menu**: New chat, clear cache, hide to tray, quit
- **Tools Menu**: Always on top, focus mode, global shortcuts info
- **Help Menu**: About, check for updates, keyboard shortcuts

### Data Storage
- **Windows**: `%APPDATA%\Desktop GPT\`
- **macOS**: `~/Library/Application Support/Desktop GPT/`
- **Linux**: `~/.config/Desktop GPT/`

## 🛠️ Development

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Git

### Setup
```bash
# Clone the repository
git clone https://github.com/yourusername/DesktopGPT.git
cd DesktopGPT

# Install dependencies
npm install

# Run in development mode
npm run dev
```

### Building
```bash
# Build for current platform
npm run build

# Build for specific platforms
npm run build:win    # Windows
npm run build:mac    # macOS  
npm run build:linux  # Linux

# Build and publish release
npm run release
```

### Project Structure
```
DesktopGPT/
├── main.js              # Main Electron process
├── preload.js           # Preload script for security
├── package.json         # Dependencies and build config
├── assets/              # Icons and images
│   ├── chatgpt-icon.png
│   ├── chatgpt-icon.ico
│   └── chatgpt-icon.icns
├── build/               # Build configuration
│   ├── installer.nsh    # Windows installer script
│   ├── entitlements.mac.plist
│   └── background.png
└── build-scripts/       # Build automation
    └── build.js
```

## 🔧 Troubleshooting

### Common Issues

**App won't start**
- Check if another instance is running in system tray
- Restart and try again
- Check antivirus software isn't blocking it

**Login issues**
- Clear cache: File → Clear Cache
- Check internet connection
- Try logging in via web browser first

**Global shortcuts not working**
- Check if shortcuts conflict with other apps
- Restart the application
- Run as administrator (Windows) if needed

**Updates not working**
- Check internet connection
- Manually download from releases page
- Clear cache and restart

### Reset Application
```bash
# Windows
rd /s "%APPDATA%\Desktop GPT"

# macOS  
rm -rf "~/Library/Application Support/Desktop GPT"

# Linux
rm -rf "~/.config/Desktop GPT"
```

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Development Guidelines
- Follow existing code style
- Test on multiple platforms when possible
- Update documentation for new features
- Add appropriate error handling

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenAI** for ChatGPT
- **Electron** framework
- **electron-builder** for packaging
- **electron-updater** for auto-updates

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/DesktopGPT/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/DesktopGPT/discussions)
- **Email**: your.email@example.com

## 🔄 Changelog

### v1.0.0
- Initial release
- System tray integration
- Global keyboard shortcuts
- Auto-updater functionality
- Cross-platform installers
- Window state persistence
- Focus mode and always on top

---

<div align="center">
  <b>Made with ❤️ for the ChatGPT community</b>
</div>