// main.js
const { app, BrowserWindow, Menu, shell, Tray, nativeImage, Notification, globalShortcut, session, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');

let mainWindow;
let tray = null;
const isDev = process.env.NODE_ENV === 'development';

// No custom authentication needed - OpenAI handles it

// Store window state
const windowStateFile = path.join(app.getPath('userData'), 'window-state.json');

// No custom authentication functions needed

// Store window state
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
    // Don't create tray if it already exists
    if (tray !== null) {
        return;
    }
    
    const iconPath = path.join(__dirname, 'assets', 'chatgpt-icon.png');
    const trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
    
    tray = new Tray(trayIcon);
    
    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Show Desktop GPT',
            click: () => {
                showMainWindow();
            }
        },
        {
            label: 'New Chat',
            click: () => {
                showMainWindow();
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
                app.isQuiting = true;
                app.quit();
            }
        }
    ]);
    
    tray.setToolTip('Desktop GPT');
    tray.setContextMenu(contextMenu);
    
    tray.on('click', () => {
        showMainWindow();
    });
}

function showMainWindow() {
    if (!mainWindow) {
        createWindow();
        return;
    }
    
    if (mainWindow.isMinimized()) {
        mainWindow.restore();
    }
    
    if (!mainWindow.isVisible()) {
        mainWindow.show();
    }
    
    mainWindow.focus();
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
    }    // Set up session preferences
    const ses = session.fromPartition('persist:chatgpt');
    ses.setPermissionRequestHandler((webContents, permission, callback) => {
        const allowedPermissions = ['notifications', 'microphone', 'camera'];
        callback(allowedPermissions.includes(permission));
    });    // Handle new window requests for main window
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        console.log('New window request for:', url);
        
        try {
            const parsedUrl = new URL(url);
              // Allow new windows/tabs for OpenAI domains and related services
            const allowedDomains = [
                'chat.openai.com',
                'openai.com',
                'auth0.openai.com',
                'platform.openai.com',
                'help.openai.com',
                'cdn.auth0.com',
                'auth.openai.com',
                'api.openai.com'
            ];
            
            const isAllowedDomain = allowedDomains.some(domain => 
                parsedUrl.hostname === domain || parsedUrl.hostname.endsWith('.' + domain)
            );
            
            if (isAllowedDomain) {
                console.log('Allowing navigation to:', url);
                // Navigate in the current window instead of opening new window
                mainWindow.loadURL(url);
                return { action: 'deny' };
            } else {
                console.log('Opening external URL in browser:', url);
                // Open external links in system browser
                shell.openExternal(url);
                return { action: 'deny' };
            }
        } catch (error) {
            console.error('Error parsing URL:', url, error);
            // If URL parsing fails, open in external browser as fallback
            shell.openExternal(url);
            return { action: 'deny' };
        }
    });

    // Handle navigation within main window
    mainWindow.webContents.on('will-navigate', (event, url) => {
        console.log('Navigation request to:', url);
        
        try {
            const parsedUrl = new URL(url);
              // Allow navigation within OpenAI domains and related services
            const allowedDomains = [
                'chat.openai.com',
                'openai.com',
                'auth0.openai.com',
                'platform.openai.com',
                'help.openai.com',
                'cdn.auth0.com',
                'auth.openai.com',
                'api.openai.com'
            ];
            
            const isAllowedDomain = allowedDomains.some(domain => 
                parsedUrl.hostname === domain || parsedUrl.hostname.endsWith('.' + domain)
            );
            
            if (!isAllowedDomain) {
                console.log('Blocking navigation to external URL:', url);
                event.preventDefault();
                shell.openExternal(url);
            } else {
                console.log('Allowing navigation to:', url);
            }
        } catch (error) {
            console.error('Error parsing URL:', url, error);
            // If URL parsing fails, prevent navigation and open externally
            event.preventDefault();
            shell.openExternal(url);
        }
    });// Set a proper user agent
    mainWindow.webContents.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');    // Load ChatGPT directly - OpenAI handles authentication
    console.log('Loading ChatGPT directly...');
    mainWindow.loadURL('https://chat.openai.com');// Show window when ready
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

    // Handle window destroy
    mainWindow.on('closed', () => {
        mainWindow = null;
    });    // Error handling
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
        console.error('Failed to load:', {
            errorCode,
            errorDescription,
            validatedURL
        });
        
        let errorMessage = 'Failed to load ChatGPT.';
        let suggestion = 'Please check your internet connection.';
        
        // Provide more specific error messages based on error codes
        switch(errorCode) {
            case -101: // ERR_NETWORK_CHANGED
                errorMessage = 'Network connection changed.';
                suggestion = 'Please check your internet connection and try again.';
                break;
            case -105: // ERR_NAME_NOT_RESOLVED
                errorMessage = 'Could not resolve chat.openai.com.';
                suggestion = 'Please check your DNS settings or try again later.';
                break;
            case -106: // ERR_INTERNET_DISCONNECTED
                errorMessage = 'No internet connection.';
                suggestion = 'Please check your internet connection.';
                break;
            case -118: // ERR_CONNECTION_TIMED_OUT
                errorMessage = 'Connection timed out.';
                suggestion = 'The server took too long to respond. Please try again.';
                break;
            case -200: // ERR_CERT_COMMON_NAME_INVALID
            case -201: // ERR_CERT_DATE_INVALID
            case -202: // ERR_CERT_AUTHORITY_INVALID
                errorMessage = 'SSL Certificate error.';
                suggestion = 'There may be a security issue. Try again or check your system time.';
                break;
            default:
                if (errorCode < 0) {
                    errorMessage = `Network error (${errorCode}): ${errorDescription}`;
                    suggestion = 'Try refreshing or check your network connection.';
                }
        }
        
        const errorHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        height: 100vh;
                        margin: 0;
                        background: #f5f5f5;
                        color: #333;
                    }
                    .container {
                        text-align: center;
                        background: white;
                        padding: 40px;
                        border-radius: 12px;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                        max-width: 500px;
                    }
                    .icon {
                        font-size: 48px;
                        margin-bottom: 20px;
                    }
                    h1 {
                        color: #d73a49;
                        margin-bottom: 16px;
                        font-size: 24px;
                    }
                    p {
                        margin-bottom: 8px;
                        line-height: 1.5;
                    }
                    .suggestion {
                        color: #666;
                        font-size: 14px;
                        margin-bottom: 24px;
                    }
                    .buttons {
                        display: flex;
                        gap: 12px;
                        justify-content: center;
                        flex-wrap: wrap;
                    }
                    button {
                        padding: 12px 24px;
                        font-size: 16px;
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                        font-weight: 500;
                        transition: all 0.2s;
                    }                    .retry-btn {
                        background: #28a745;
                        color: white;
                    }
                    .retry-btn:hover {
                        background: #218838;
                    }
                    .details {
                        margin-top: 20px;
                        padding: 12px;
                        background: #f8f9fa;
                        border-radius: 6px;
                        font-size: 12px;
                        color: #666;
                        font-family: monospace;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="icon">⚠️</div>
                    <h1>Connection Error</h1>
                    <p><strong>${errorMessage}</strong></p>
                    <p class="suggestion">${suggestion}</p>
                      <div class="buttons">
                        <button class="retry-btn" onclick="location.reload()">
                            🔄 Retry
                        </button>
                        <button class="retry-btn" onclick="window.location.href='https://chat.openai.com'">
                            🏠 Go to ChatGPT
                        </button>
                    </div>
                    
                    <div class="details">
                        Error Code: ${errorCode}<br>
                        URL: ${validatedURL}<br>
                        Description: ${errorDescription}
                    </div>
                </div>
            </body>
            </html>
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

    // Update navigation menu state
    function updateNavigationMenu() {
        if (!mainWindow) return;
        
        const menu = Menu.getApplicationMenu();
        if (menu) {
            const backItem = menu.getMenuItemById('goBack');
            const forwardItem = menu.getMenuItemById('goForward');
            
            if (backItem) {
                backItem.enabled = mainWindow.webContents.canGoBack();
            }
            if (forwardItem) {
                forwardItem.enabled = mainWindow.webContents.canGoForward();
            }
        }
    }

    // Update menu state on navigation
    mainWindow.webContents.on('did-navigate', () => {
        updateNavigationMenu();
    });

    // Update menu state on back/forward
    mainWindow.webContents.on('did-navigate-in-page', () => {
        updateNavigationMenu();
    });

    // Initial menu state update
    setTimeout(() => {
        updateNavigationMenu();
    }, 1000);
}

function registerGlobalShortcuts() {
    // Global shortcut to toggle window
    globalShortcut.register('CommandOrControl+Shift+G', () => {
        if (mainWindow && mainWindow.isVisible() && mainWindow.isFocused()) {
            mainWindow.hide();
        } else {
            showMainWindow();
        }
    });

    // Global shortcut for new chat
    globalShortcut.register('CommandOrControl+Shift+N', () => {
        showMainWindow();
        if (mainWindow) {
            mainWindow.webContents.executeJavaScript(`
                const newChatButton = document.querySelector('[data-testid="new-chat-button"]') || 
                                     document.querySelector('button[aria-label*="New chat"]') ||
                                     document.querySelector('a[href="/"]');
                if (newChatButton) newChatButton.click();
            `);
        }
    });

    // Navigation shortcuts when window is focused
    app.on('browser-window-focus', () => {
        // Back navigation
        globalShortcut.register('Alt+Left', () => {
            if (mainWindow && mainWindow.isFocused() && mainWindow.webContents.canGoBack()) {
                mainWindow.webContents.goBack();
            }
        });

        // Forward navigation  
        globalShortcut.register('Alt+Right', () => {
            if (mainWindow && mainWindow.isFocused() && mainWindow.webContents.canGoForward()) {
                mainWindow.webContents.goForward();
            }
        });

        // Refresh
        globalShortcut.register('CommandOrControl+R', () => {
            if (mainWindow && mainWindow.isFocused()) {
                mainWindow.webContents.reload();
            }
        });
    });

    app.on('browser-window-blur', () => {
        // Unregister navigation shortcuts when window loses focus
        globalShortcut.unregister('Alt+Left');
        globalShortcut.unregister('Alt+Right');
        globalShortcut.unregister('CommandOrControl+R');
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
            submenu: [                {
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
                { type: 'separator' },                {
                    label: 'Go Back',
                    accelerator: 'Alt+Left',
                    enabled: false,
                    id: 'goBack',
                    click: () => {
                        if (mainWindow.webContents.canGoBack()) {
                            mainWindow.webContents.goBack();
                        }
                    }
                },
                {
                    label: 'Go Forward',
                    accelerator: 'Alt+Right',
                    enabled: false,
                    id: 'goForward',
                    click: () => {
                        if (mainWindow.webContents.canGoForward()) {
                            mainWindow.webContents.goForward();
                        }
                    }
                },
                {
                    label: 'Refresh',
                    accelerator: 'CmdOrCtrl+R',
                    click: () => {
                        mainWindow.webContents.reload();
                    }
                },
                { type: 'separator' },{
                    label: 'Clear Cache',
                    click: async () => {
                        const ses = session.fromPartition('persist:chatgpt');
                        await ses.clearCache();
                        await ses.clearStorageData({
                            storages: ['cookies', 'localstorage', 'sessionstorage']
                        });
                        mainWindow.reload();
                    }                },
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
                { type: 'separator' },                {
                    label: 'Keyboard Shortcuts',
                    accelerator: 'CmdOrCtrl+/',
                    click: () => {
                        const shortcutsWindow = new BrowserWindow({
                            width: 500,
                            height: 400,
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

                        const shortcutsHtml = `
                            <!DOCTYPE html>
                            <html>
                            <head>
                                <style>
                                    body {
                                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
                                        padding: 20px;
                                        margin: 0;
                                        background: #f5f5f5;
                                        line-height: 1.6;
                                    }
                                    .title { font-size: 20px; font-weight: bold; margin-bottom: 20px; text-align: center; }
                                    .shortcut { 
                                        display: flex; 
                                        justify-content: space-between; 
                                        padding: 8px 0; 
                                        border-bottom: 1px solid #ddd;
                                    }
                                    .key { 
                                        background: #e0e0e0; 
                                        padding: 2px 8px; 
                                        border-radius: 4px; 
                                        font-family: monospace;
                                        font-weight: bold;
                                    }
                                </style>
                            </head>
                            <body>
                                <div class="title">Keyboard Shortcuts</div>
                                <div class="shortcut">
                                    <span>New Chat</span>
                                    <span class="key">Ctrl+N</span>
                                </div>
                                <div class="shortcut">
                                    <span>Toggle Window (Global)</span>
                                    <span class="key">Ctrl+Shift+G</span>
                                </div>
                                <div class="shortcut">
                                    <span>New Chat (Global)</span>
                                    <span class="key">Ctrl+Shift+N</span>
                                </div>
                                <div class="shortcut">
                                    <span>Hide to Tray</span>
                                    <span class="key">Ctrl+H</span>
                                </div>
                                <div class="shortcut">
                                    <span>Focus Mode</span>
                                    <span class="key">F11</span>
                                </div>
                                <div class="shortcut">
                                    <span>Show Shortcuts</span>
                                    <span class="key">Ctrl+/</span>
                                </div>
                                <div class="shortcut">
                                    <span>Quit Application</span>
                                    <span class="key">Ctrl+Q</span>
                                </div>
                            </body>
                            </html>
                        `;

                        shortcutsWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(shortcutsHtml)}`);
                        shortcutsWindow.once('ready-to-show', () => {
                            shortcutsWindow.show();
                        });
                    }
                }
            ]
        }
    ];

    // macOS specific menu adjustments
    if (process.platform === 'darwin') {
        template.unshift({
            label: app.getName(),
            submenu: [
                { label: 'About ' + app.getName(), role: 'about' },
                { type: 'separator' },
                { label: 'Services', role: 'services', submenu: [] },
                { type: 'separator' },
                { label: 'Hide ' + app.getName(), accelerator: 'Command+H', role: 'hide' },
                { label: 'Hide Others', accelerator: 'Command+Shift+H', role: 'hideothers' },
                { label: 'Show All', role: 'unhide' },
                { type: 'separator' },
                { label: 'Quit', accelerator: 'Command+Q', click: () => app.quit() }
            ]
        });
    }

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

// App event handlers
app.whenReady().then(() => {
    createWindow();
    createTray();
    createMenu();
    registerGlobalShortcuts();
    setupAutoUpdater();

    app.on('activate', () => {
        // On macOS, re-create window when dock icon is clicked and no windows are open
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        } else if (mainWindow) {
            // Show existing window if it exists but is hidden
            showMainWindow();
        }
    });
});

app.on('window-all-closed', () => {
    // On macOS, keep the app running even when all windows are closed
    // On other platforms, keep running if tray is enabled
    if (process.platform !== 'darwin' && !tray) {
        app.quit();
    }
});

app.on('before-quit', () => {
    app.isQuiting = true;
    saveWindowState();
});

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
    if (tray) {
        tray.destroy();
        tray = null;
    }
});

// No authentication needed - OpenAI handles it in the browser
