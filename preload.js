const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    openExternal: (url) => ipcRenderer.invoke('open-external', url),
    getVersion: () => process.versions.electron,
    getPlatform: () => process.platform,
    
    // Theme detection
    getTheme: () => {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    },
    
    onThemeChange: (callback) => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', (e) => {
            callback(e.matches ? 'dark' : 'light');
        });
    }
});

// Enhance the page when it loads
window.addEventListener('DOMContentLoaded', () => {
    console.log('Desktop GPT loaded successfully');
    
    // Optional: Add custom CSS for better desktop experience
    const style = document.createElement('style');
    style.textContent = `
        /* Custom desktop app styling */
        body {
            user-select: text !important;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif !important;
        }
        
        /* Improve scrollbar appearance */
        ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
        }
        
        ::-webkit-scrollbar-track {
            background: transparent;
        }
        
        ::-webkit-scrollbar-thumb {
            background: rgba(128, 128, 128, 0.5);
            border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
            background: rgba(128, 128, 128, 0.8);
        }
        
        /* Better focus indicators */
        button:focus,
        input:focus,
        textarea:focus {
            outline: 2px solid #0066cc !important;
            outline-offset: 2px !important;
        }
        
        /* Improve text selection */
        ::selection {
            background: #0066cc40;
        }
        
        /* Hide scrollbars when not hovering (for cleaner look) */
        * {
            scrollbar-width: thin;
            scrollbar-color: rgba(128, 128, 128, 0.5) transparent;
        }
        
        /* Custom notification styling */
        .desktop-notification {
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--color-surface-primary);
            border: 1px solid var(--color-border-medium);
            border-radius: 8px;
            padding: 12px 16px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 10000;
            max-width: 300px;
            animation: slideIn 0.3s ease-out;
        }
        
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);
    
    // Add keyboard shortcuts help
    document.addEventListener('keydown', (e) => {
        // Ctrl+? or Cmd+? to show shortcuts
        if ((e.ctrlKey || e.metaKey) && e.key === '/') {
            e.preventDefault();
            showShortcutsHelp();
        }
    });
    
    // Enhanced error handling
    window.addEventListener('error', (e) => {
        console.error('Page error:', e.error);
    });
    
    window.addEventListener('unhandledrejection', (e) => {
        console.error('Unhandled promise rejection:', e.reason);
    });
});

function showShortcutsHelp() {
    const existingHelp = document.querySelector('.shortcuts-help');
    if (existingHelp) {
        existingHelp.remove();
        return;
    }
    
    const helpDiv = document.createElement('div');
    helpDiv.className = 'shortcuts-help desktop-notification';
    helpDiv.innerHTML = `
        <h3 style="margin: 0 0 10px 0; font-size: 16px;">Keyboard Shortcuts</h3>
        <div style="font-size: 14px; line-height: 1.4;">
            <div><strong>Ctrl+N:</strong> New Chat</div>
            <div><strong>Ctrl+Shift+G:</strong> Toggle Window</div>
            <div><strong>Ctrl+Shift+N:</strong> New Chat (Global)</div>
            <div><strong>Ctrl+/:</strong> Show/Hide this help</div>
            <div><strong>F11:</strong> Focus Mode</div>
        </div>
        <button onclick="this.parentElement.remove()" 
                style="position: absolute; top: 5px; right: 5px; border: none; background: none; cursor: pointer; font-size: 18px;">&times;</button>
    `;
    
    document.body.appendChild(helpDiv);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
        if (helpDiv.parentElement) {
            helpDiv.remove();
        }
    }, 10000);
}

// Detect when ChatGPT finishes loading
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
            // Check if main chat interface is loaded
            const chatContainer = document.querySelector('[role="main"]') || 
                                document.querySelector('.chat-container') ||
                                document.querySelector('[data-testid="conversation-turn"]');
            
            if (chatContainer && !window.chatLoaded) {
                window.chatLoaded = true;
                console.log('ChatGPT interface fully loaded');
                
                // Add desktop-specific enhancements
                enhanceDesktopExperience();
            }
        }
    });
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});

function enhanceDesktopExperience() {
    // Add right-click context menu enhancements
    document.addEventListener('contextmenu', (e) => {
        // Allow native context menu for text inputs and text areas
        const target = e.target;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
            return; // Allow default context menu
        }
    });
    
    // Improve copy/paste experience
    document.addEventListener('paste', (e) => {
        console.log('Paste event detected - Desktop GPT');
    });
}
