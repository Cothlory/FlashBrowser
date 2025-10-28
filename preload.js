process.once('loaded', () => {
    const electron = require('electron')
    // Ensure a safe default zoom factor in the preload (no undefined values)
    try {
        if (electron && electron.webFrame && typeof electron.webFrame.setZoomFactor === 'function') {
            electron.webFrame.setZoomFactor(1)
        }
    }
    catch (e) {
        // ignore in case webFrame isn't available in this context
    }
    global.electron = electron
})