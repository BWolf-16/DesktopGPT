// main.js
const { app, BrowserWindow, Menu, shell, Tray, nativeImage, Notification, globalShortcut, session } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');

let mainWindow;
let tray = null;
const isDev = process.env.NODE_ENV === 'development';

// Store window state
const windowStateFile = path.join(app.getPath('userData'), 'window-state.json');

function saveWindowState() {
    if (mainWindow) {
        const bounds = mainWindow.getBounds();
        const state = {
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height,
            isMaximized: mainWindow.isMaximized(),
            isMinimized: mainWindow.isMinimized()
        };
        
        try {
            fs.writeFileSync(windowStateFile, JSON.stringify(state));
        } catch (error) {
            console.error('Failed to save window state:', error);
        }
    }
}

function loadWindowState() {
    try {
        if (fs.existsSync(windowStateFile)) {
            return JSON.parse(fs.readFileSync(windowStateFile, 'utf8'));
        }
    } catch (error) {
        console.error('Failed to load window state:', error);
    }
    
    return {
        width: 1200,
        height: 800,
        x: undefined,
        y: undefined,
        isMaximized: false
    };
}

function createTray() {
    const iconPath = path.join(__dirname, 'assets', 'chatgpt-icon.png');
    const trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
    
    tray = new Tray(trayIcon);
    
    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Show Desktop GPT',
            click: () => {
                if (mainWindow) {
                    if (mainWindow.isMinimized()) {
                        mainWindow.restore();
                    }
                    mainWindow.show();
                    mainWindow.focus();
                }
            }
        },
        {
            label: 'New Chat',
            click: () => {
                if (mainWindow) {
                    mainWindow.webContents.executeJavaScript(`
                        const newChatButton = document.querySelector('[data-testid="new-chat-button"]') || 
                                             document.querySelector('button[aria-label*="New chat"]') ||
                                             document.querySelector('a[href="/"]');
                        if (newChatButton) newChatButton.click();
                    `);
                }
            }
        },
        { type: 'separator' },
        {
            label: 'Quit',
            click: () => {
                app.quit();
            }
        }
    ]);
    
    tray.setToolTip('Desktop GPT');
    tray.setContextMenu(contextMenu);
    
    tray.on('click', () => {
        if (mainWindow) {
            if (mainWindow.isVisible()) {
                mainWindow.hide();
            } else {
                mainWindow.show();
                mainWindow.focus();
            }
        }
    });
}

function createWindow() {
    const windowState = loadWindowState();
    
    // Create the browser window with improved settings
    mainWindow = new BrowserWindow({
        width: windowState.width,
        height: windowState.height,
        x: windowState.x,
        y: windowState.y,
        minWidth: 800,
        minHeight: 600,
        icon: path.join(__dirname, 'assets', 'chatgpt-icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'), 
            nodeIntegration: false, 
            contextIsolation: true,
            webSecurity: true,
            allowRunningInsecureContent: false,
            partition: 'persist:chatgpt', // Persistent session
        },
        title: "Desktop GPT",
        show: false,
        titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
        autoHideMenuBar: !isDev, // Hide menu bar in production, show in dev
    });

    // Restore maximized state
    if (windowState.isMaximized) {
        mainWindow.maximize();
    }

    // Set up session preferences
    const ses = session.fromPartition('persist:chatgpt');
    ses.setPermissionRequestHandler((webContents, permission, callback) => {
        const allowedPermissions = ['notifications', 'microphone'];
        callback(allowedPermissions.includes(permission));
    });

    // Set a proper user agent
    mainWindow.webContents.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Load the ChatGPT website
    mainWindow.loadURL('https://chat.openai.com');

    // Show window when ready
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        
        // Show notification on first run
        if (Notification.isSupported()) {
            new Notification({
                title: 'Desktop GPT',
                body: 'Ready to chat! Use Ctrl+Shift+G to toggle the window.',
                icon: path.join(__dirname, 'assets', 'chatgpt-icon.png')
            }).show();
        }
    });

    // Save window state on resize/move
    mainWindow.on('resize', saveWindowState);
    mainWindow.on('move', saveWindowState);
    mainWindow.on('maximize', saveWindowState);
    mainWindow.on('unmaximize', saveWindowState);

    // Handle window close
    mainWindow.on('close', (event) => {
        if (!app.isQuiting) {
            event.preventDefault();
            mainWindow.hide();
            
            if (Notification.isSupported() && process.platform === 'win32') {
                new Notification({
                    title: 'Desktop GPT',
                    body: 'App was minimized to tray',
                }).show();
            }
        }
    });

    // Error handling
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
        console.error('Failed to load:', errorDescription);
        
        const errorHtml = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: Arial, sans-serif;">
                <h1>Connection Error</h1>
                <p>Failed to load ChatGPT. Please check your internet connection.</p>
                <button onclick="location.reload()" style="padding: 10px 20px; font-size: 16px; cursor: pointer;">Retry</button>
            </div>
        `;
        
        mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorHtml)}`);
    });

    // Online/Offline detection
    mainWindow.webContents.on('dom-ready', () => {
        mainWindow.webContents.executeJavaScript(`
            window.addEventListener('online', () => {
                console.log('Back online');
                if (location.href.startsWith('data:')) {
                    location.href = 'https://chat.openai.com';
                }
            });
            
            window.addEventListener('offline', () => {
                console.log('Gone offline');
            });
        `);
    });
}

function registerGlobalShortcuts() {
    // Global shortcut to toggle window
    globalShortcut.register('CommandOrControl+Shift+G', () => {
        if (mainWindow) {
            if (mainWindow.isVisible() && mainWindow.isFocused()) {
                mainWindow.hide();
            } else {
                mainWindow.show();
                mainWindow.focus();
            }
        }
    });

    // Global shortcut for new chat
    globalShortcut.register('CommandOrControl+Shift+N', () => {
        if (mainWindow) {
            mainWindow.webContents.executeJavaScript(`
                const newChatButton = document.querySelector('[data-testid="new-chat-button"]') || 
                                     document.querySelector('button[aria-label*="New chat"]') ||
                                     document.querySelector('a[href="/"]');
                if (newChatButton) newChatButton.click();
            `);
        }
    });
}

// Configure auto-updater
function setupAutoUpdater() {
    if (isDev) {
        console.log('Auto-updater disabled in development');
        return;
    }

    autoUpdater.checkForUpdatesAndNotify();
    
    autoUpdater.on('checking-for-update', () => {
        console.log('Checking for update...');
    });
    
    autoUpdater.on('update-available', (info) => {
        console.log('Update available.');
        
        if (Notification.isSupported()) {
            new Notification({
                title: 'Desktop GPT Update',
                body: 'A new version is available. It will be downloaded in the background.',
                icon: path.join(__dirname, 'assets', 'chatgpt-icon.png')
            }).show();
        }
    });
    
    autoUpdater.on('update-not-available', (info) => {
        console.log('Update not available.');
    });
    
    autoUpdater.on('error', (err) => {
        console.log('Error in auto-updater. ' + err);
    });
    
    autoUpdater.on('download-progress', (progressObj) => {
        let log_message = "Download speed: " + progressObj.bytesPerSecond;
        log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
        log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
        console.log(log_message);
    });
    
    autoUpdater.on('update-downloaded', (info) => {
        console.log('Update downloaded');
        
        if (Notification.isSupported()) {
            const notification = new Notification({
                title: 'Desktop GPT Update Ready',
                body: 'Update downloaded. Click to restart and apply the update.',
                icon: path.join(__dirname, 'assets', 'chatgpt-icon.png')
            });
            
            notification.on('click', () => {
                autoUpdater.quitAndInstall();
            });
            
            notification.show();
        }
    });
    
    // Check for updates every hour
    setInterval(() => {
        autoUpdater.checkForUpdatesAndNotify();
    }, 60 * 60 * 1000);
}

function createMenu() {
    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'New Chat',
                    accelerator: 'CmdOrCtrl+N',
                    click: () => {
                        mainWindow.webContents.executeJavaScript(`
                            const newChatButton = document.querySelector('[data-testid="new-chat-button"]') || 
                                                 document.querySelector('button[aria-label*="New chat"]') ||
                                                 document.querySelector('a[href="/"]');
                            if (newChatButton) newChatButton.click();
                        `);
                    }
                },
                {
                    label: 'Clear Cache',
                    click: async () => {
                        const ses = session.fromPartition('persist:chatgpt');
                        await ses.clearCache();
                        await ses.clearStorageData({
                            storages: ['cookies', 'localstorage', 'sessionstorage']
                        });
                        mainWindow.reload();
                    }
                },
                { type: 'separator' },
                {
                    label: 'Hide to Tray',
                    accelerator: 'CmdOrCtrl+H',
                    click: () => {
                        mainWindow.hide();
                    }
                },
                {
                    label: 'Quit',
                    accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
                    click: () => {
                        app.isQuiting = true;
                        app.quit();
                    }
                }
            ]
        },
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                { role: 'selectall' }
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        },
        {
            label: 'Window',
            submenu: [
                { role: 'minimize' },
                { role: 'close' }
            ]
        },
        {
            label: 'Tools',
            submenu: [
                {
                    label: 'Always on Top',
                    type: 'checkbox',
                    click: (menuItem) => {
                        mainWindow.setAlwaysOnTop(menuItem.checked);
                    }
                },
                {
                    label: 'Focus Mode',
                    accelerator: 'F11',
                    click: () => {
                        mainWindow.setFullScreen(!mainWindow.isFullScreen());
                    }
                },
                { type: 'separator' },
                {
                    label: 'Global Shortcuts',
                    submenu: [
                        { label: 'Toggle Window: Ctrl+Shift+G', enabled: false },
                        { label: 'New Chat: Ctrl+Shift+N', enabled: false }
                    ]
                }
            ]
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'About Desktop GPT',
                    click: () => {
                        const aboutWindow = new BrowserWindow({
                            width: 400,
                            height: 300,
                            parent: mainWindow,
                            modal: true,
                            show: false,
                            resizable: false,
                            minimizable: false,
                            maximizable: false,
                            webPreferences: {
                                nodeIntegration: false,
                                contextIsolation: true
                            }
                        });

                        const aboutHtml = `
                            <!DOCTYPE html>
                            <html>
                            <head>
                                <style>
                                    body {
                                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
                                        text-align: center;
                                        padding: 20px;
                                        margin: 0;
                                        background: #f5f5f5;
                                    }
                                    .icon { width: 64px; height: 64px; margin: 20px auto; }
                                    .title { font-size: 24px; font-weight: bold; margin: 10px 0; }
                                    .version { font-size: 14px; color: #666; margin: 5px 0; }
                                    .description { font-size: 14px; margin: 15px 0; }
                                    .links { margin-top: 20px; }
                                    .links a { color: #0066cc; text-decoration: none; margin: 0 10px; }
                                    .links a:hover { text-decoration: underline; }
                                </style>
                            </head>
                            <body>
                                <img class="icon" src="../assets/chatgpt-icon.png" alt="Desktop GPT">
                                <div class="title">Desktop GPT</div>
                                <div class="version">Version ${app.getVersion()}</div>
                                <div class="description">A desktop application for ChatGPT with system integration</div>
                                <div class="links">
                                    <a href="#" onclick="require('electron').shell.openExternal('https://github.com/yourusername/DesktopGPT')">GitHub</a>
                                    <a href="#" onclick="require('electron').shell.openExternal('https://github.com/yourusername/DesktopGPT/issues')">Report Issues</a>
                                </div>
                            </body>
                            </html>
                        `;

                        aboutWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(aboutHtml)}`);
                        aboutWindow.once('ready-to-show', () => {
                            aboutWindow.show();
                        });
                    }
                },
                {
                    label: 'Check for Updates',
                    click: () => {
                        if (isDev) {
                            new Notification({
                                title: 'Desktop GPT',
                                body: 'Auto-updater is disabled in development mode.',
                            }).show();
                        } else {
                            autoUpdater.checkForUpdatesAndNotify();
                        }
                    }
                },
                { type: 'separator' },
                {
                    label: 'Keyboard Shortcuts',
                    accelerator: 'CmdOrCtrl+/',
