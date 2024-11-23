// main.js
const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        icon: path.join(__dirname, 'assets', 'chatgpt-icon.png'), // Set the custom icon
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'), 
            nodeIntegration: false, 
            contextIsolation: true, 
        },
        title: "Desktop GPT" // Set the window title
    });

    // Load the ChatGPT website
    mainWindow.loadURL('https://chat.openai.com');

    // Optional: Uncomment to open DevTools for debugging
    // mainWindow.webContents.openDevTools();
}

// This method will be called when Electron has finished initialization.
app.on('ready', createWindow);

// Quit the application when all windows are closed (except for macOS).
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// On macOS, re-create the window when the dock icon is clicked and no other windows are open.
app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
