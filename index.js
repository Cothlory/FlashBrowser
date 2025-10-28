const {
    app,
    protocol,
    BrowserWindow,
    globalShortcut,
    Menu
} = require('electron');
const { autoUpdater } = require("electron-updater");
const path = require('path');
const Store = require('./store');
const contextMenu = require('electron-context-menu');
const { ipcMain } = require('electron');

// Configure context menu with error handling for compatibility with electron-navigation
contextMenu({
    showSaveImageAs: true,
    // Prevent errors when electron-navigation passes webview instead of BrowserWindow
    prepend: (defaultActions, params, browserWindow) => []
});

let mainWindow;

let pluginName = null; //put the right flash plugin in depending on the operating system.
switch (process.platform) {
    case 'win32':
        switch (process.arch) {
            case 'ia32':
            case 'x32':
                pluginName = 'flashver/pepflashplayer32.dll'
                console.log("ran!");
                break
            case 'x64':
                pluginName = 'flashver/pepflashplayer64.dll'
                console.log("ran!");
                break
        }
        break
    case 'linux':
        switch (process.arch) {
            case 'ia32':
            case 'x32':
                pluginName = 'flashver/libpepflashplayer.so' // added and tested :D
                break
            case 'x64':
                pluginName = 'flashver/libpepflashplayer.so'
                break
        }

        app.commandLine.appendSwitch('no-sandbox');
        break
    case 'darwin':
        pluginName = 'flashver/PepperFlashPlayer.plugin'
        break
}
// Disable hardware acceleration to fix GL framebuffer errors on some Linux systems
app.disableHardwareAcceleration();
app.commandLine.appendSwitch("disable-renderer-backgrounding");
if (process.platform !== "darwin") {
    app.commandLine.appendSwitch('high-dpi-support', "1");
    //app.commandLine.appendSwitch('force-device-scale-factor', "1");
}
app.commandLine.appendSwitch("--enable-npapi");
app.commandLine.appendSwitch('ppapi-flash-path', path.join(__dirname, pluginName));
//app.commandLine.appendSwitch('ppapi-flash-path', path.join(__dirname.includes(".asar") ? process.resourcesPath : __dirname, "plugins/" + pluginName));
app.commandLine.appendSwitch('disable-site-isolation-trials');
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('ignore-certificate-errors', 'true');
app.commandLine.appendSwitch('allow-insecure-localhost', 'true');

let sendWindow = (identifier, message) => {
    mainWindow.webContents.send(identifier, message);
};

const store = new Store({
    configName: 'user-preferences',
    defaults: {
        windowBounds: { width: 1280, height: 720, max: false }
    }
});

const template = [];

const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);

app.on('ready', () => {
    let { width, height, isMax } = store.get('windowBounds');
    let filePath = 'filePath';
    console.log("inti param" + process.argv);
    if (process.argv.length >= 2 && process.argv[1].indexOf(".swf") > 1) {
        if (process.argv[1].indexOf("http") > 0) {
            console.log(998 + process.argv[1]);
            filePath = process.argv[1].replace("FlashBrowser:", "");
        }
        else {
            filePath = process.argv[1];
            filePath = filePath.replace(/\\/g, "/");
            filePath = 'file:///' + filePath;
            //open, read, handle file
        }
    }
    if (width < 100 || height < 100) {
        width = 800;
        height = 500;
    }

    mainWindow = new BrowserWindow({
        width: width,
        height: height,
        frame: false,
        show: true,
        backgroundColor: '#202124',
        webPreferences: {
            nodeIntegration: true,
            webviewTag: true,
            plugins: true,
            contextIsolation: false,
            enableRemoteModule: true,
            additionalArguments: [filePath],
            zoomFactor: 1,
            nodeIntegration: true,
            preload: path.resolve(path.join(__dirname, 'preload.js'))
        }
    });

    // mainWindow.once('ready-to-show', () => {
    //     mainWindow.webContents.setZoomFactor(1)
    //     mainWindow.webContents.setZoomFactor(1)
    //     mainWindow.show()
    // })
    

    mainWindow.loadURL(`file://${__dirname}/browser.html`);

    // Modify the user agent for all requests to the following urls.
    const filter = {
        // urls: ['https://*.darkorbit.com/*', 'https://*.whatsapp.com/*']
        urls: []
    }
    mainWindow.webContents.session.webRequest.onBeforeSendHeaders(filter, (details, callback) => {
        details.requestHeaders['X-APP'] = app.getVersion();
        details.requestHeaders['User-Agent'] = 'BigpointClient/1.4.6';
        if (details.url.indexOf("whatsapp") > 0) {
            details.requestHeaders['User-Agent'] = "Mozilla/5.0 (Macintosh; Intel Mac OS X 11_2_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Safari/605.1.15";
        }

        callback({ requestHeaders: details.requestHeaders })
    });

    sendWindow("version", app.getVersion());

    mainWindow.on('close', () => {
        // Save window state before closing
        try {
            if (mainWindow && !mainWindow.isDestroyed()) {
                const isMaximized = mainWindow.isMaximized();
                const bounds = mainWindow.getBounds();
                store.set('windowBounds', { 
                    width: bounds.width, 
                    height: bounds.height, 
                    isMax: isMaximized 
                });
            }
        } catch (err) {
            console.error('Error saving window state:', err);
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    mainWindow.once('ready-to-show', () => {
        if (isMax) {
            mainWindow.maximize();
        }
        mainWindow.show()
    })

    // Upper Limit is working of 500 %
    mainWindow.webContents.setVisualZoomLevelLimits(1, 5).then(console.log("Zoom Levels Have been Set between 100% and 500%")).catch((err) => console.log(err));

    mainWindow.on('resize', () => {
        // Only save size when not maximized
        if (!mainWindow.isMaximized() && !mainWindow.isFullScreen()) {
            let { width, height } = mainWindow.getBounds();
            let { isMax } = store.get('windowBounds');
            store.set('windowBounds', { width, height, isMax });
        }
    });

    // Listen for maximize/unmaximize events and notify renderer
    mainWindow.on('maximize', () => {
        // Save maximized state
        let { width, height } = store.get('windowBounds');
        store.set('windowBounds', { width, height, isMax: true });
        mainWindow.webContents.send('window-maximized');
    });

    mainWindow.on('unmaximize', () => {
        // Save unmaximized state and current size
        let { width, height } = mainWindow.getBounds();
        store.set('windowBounds', { width, height, isMax: false });
        mainWindow.webContents.send('window-unmaximized');
    });

    // Register IPC handlers once at app startup
    ipcMain.on('fullScreen-click', () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.setFullScreen(!mainWindow.isFullScreen());
        }
    });

    ipcMain.on('clearChache-click', () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            let session = mainWindow.webContents.session;
            session.clearCache();
            app.relaunch();
            app.exit();
        }
    });

    ipcMain.on('show-settings-request', () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            settingsShow(false);
        }
    });

    ipcMain.on('minimize-window', () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.minimize();
        }
    });

    ipcMain.on('maximize-window', () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.maximize();
        }
    });

    ipcMain.on('unmaximize-window', () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.unmaximize();
        }
    });

    ipcMain.on('close-window', () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.close();
        }
    });

    ipcMain.on('check-window-state', (event) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            event.reply('window-state-checked', mainWindow.isMaximized());
        }
    });

    ipcMain.on('remove-favorite', (event, index) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            removeFav(index);
        }
    });

    app.on('browser-window-focus', () => {
        globalShortcut.register('CTRL+SHIFT+q', () => {
            console.log(22321 + enav)
            NAV.newTab('https://www.flash.pm/browser/preview', {
                close: false,
                icon: NAV.TAB_ICON,
            });
        });

        globalShortcut.register('CommandOrControl+F', () => {
            mainWindow.webContents.send('on-find');
        });

        function toggleWindowFullScreen() {
            mainWindow.setFullScreen(!mainWindow.isFullScreen())
        }
        globalShortcut.register("F11", toggleWindowFullScreen);
        globalShortcut.register("Escape", () => mainWindow.setFullScreen(false));

        globalShortcut.register("CTRL+SHIFT+I", () => {
            mainWindow.webContents.openDevTools();
        });

        globalShortcut.register("CmdOrCtrl+=", () => {
            // console.log("CmdOrCtrl+");
            mainWindow.webContents.zoomFactor = mainWindow.webContents.getZoomFactor() + 0.2;
        });
        globalShortcut.register("CmdOrCtrl+6", () => {
            // console.log("CmdOrCtrl-");
            mainWindow.webContents.zoomFactor = mainWindow.webContents.getZoomFactor() - 0.2;
        });

        globalShortcut.register("CmdOrCtrl+R", () => {
            // console.log("CmdOrCtrl+R - reload");
            mainWindow.webContents.reload();
        });
        globalShortcut.register("F5", () => {
            // console.log("F5 - reload");
            mainWindow.webContents.reload();
        });

        globalShortcut.register("CTRL+SHIFT+F10", () => {
            let session = mainWindow.webContents.session;
            session.clearCache();
            app.relaunch();
            app.exit();
        });
    })

    app.on('browser-window-blur', () => {
        try {
            globalShortcut.unregisterAll();
        } catch (err) {
            console.error('Error unregistering shortcuts:', err);
        }
    })

    // Clean up shortcuts before app quits
    app.on('will-quit', () => {
        try {
            globalShortcut.unregisterAll();
        } catch (err) {
            console.error('Error unregistering shortcuts on quit:', err);
        }
    });

    console.log("checkForUpdatesAndNotify");
    autoUpdater.checkForUpdatesAndNotify();

    var { ElectronBlocker } = require('@cliqz/adblocker-electron');
    var { fetch } = require('cross-fetch');
    ElectronBlocker.fromPrebuiltAdsAndTracking(fetch).then((blocker) => {
        blocker.enableBlockingInSession(mainWindow.webContents.session);
        //console.log("--AddBlcoker started" + mainWindow.webContents.session);
    });

});

app.on('open-file', (event, path) => {
    event.preventDefault();
    console.log(path);
});
exports.test = () => clearCache();
function clearCache() {

    let session = mainWindow.webContents.session;
    session.clearCache();
    app.relaunch();
    app.exit();
};

exports.sethome = (a) => homeSetter(a);

function homeSetter(a) {
    store.set('homepage', a);
    console.log("Favorite url:" + a);
};

exports.setFavorite = (a) => favoriteSetter(a);

function favoriteSetter(a) {
    let fav = store.get('favorites');
    if (fav && fav.indexOf(a) == -1) {
        fav.push(a);
        store.set('favorites', fav);
        settingsShow(true)
    }
    else {
        // fav = [a]
    }

    console.log("S url:" + fav.indexOf(a));
};

exports.removeFav = (a) => removeFav(a);

function removeFav(a) {
    let fav = store.get('favorites');
    let fav2 = []
    for (var i = 0; i < fav.length; i++) {
        if (i != a && typeof fav[i] === 'string') {
            fav2.push(fav[i])
        }
    }
    store.set('favorites', fav2);
    settingsShow(true)
    console.log("removeFav" + a + fav2.length);
};

exports.showSettings = (a) => settingsShow(a);

function settingsShow(a) {
    let fav = store.get('favorites');
    // Ensure fav is always an array, even if undefined or not set
    if (!fav || !Array.isArray(fav)) {
        fav = [];
    }
    mainWindow.webContents.send('ping', fav, a);
};

app.on('window-all-closed', () => {
    //if (process.platform !== 'darwin') {
    app.quit();
    //}
});

autoUpdater.on('checking-for-update', () => {
    sendWindow('checking-for-update', '');
});

autoUpdater.on('update-available', () => {
    sendWindow('update-available', '');
});

autoUpdater.on('update-not-available', () => {
    sendWindow('update-not-available', '');
});

autoUpdater.on('error', (err) => {
    sendWindow('error', 'Error: ' + err);
});

autoUpdater.on('download-progress', (d) => {
    sendWindow('download-progress', {
        speed: d.bytesPerSecond,
        percent: d.percent,
        transferred: d.transferred,
        total: d.total
    });
});

autoUpdater.on('update-downloaded', () => {
    sendWindow('update-downloaded', 'Update downloaded');
    autoUpdater.quitAndInstall();
});
