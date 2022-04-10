const electron = require('electron')
const { ipcMain, app, BrowserWindow, screen } = electron;

let studentWindow;

ipcMain.on('pin::established', async function(e, total) {
    studentWindow.setSize(300, 350);
    // console.log("Current pct slouch is " + currentUserData["today"]["pct"])
    // win.webContents.send('settings:config', userConfig, currentUserData)
})

ipcMain.on('pin::collapse', async function(e, total) {
    studentWindow.setSize(300, 350);
    // console.log("Current pct slouch is " + currentUserData["today"]["pct"])
    // win.webContents.send('settings:config', userConfig, currentUserData)
})

const createPINWindow = () => {
    studentWindow = new BrowserWindow({
      width: 300,
      height: 400,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        enableRemoteModule: true,
      },
    })
  
    studentWindow.loadFile('index.html')
}



app.whenReady().then(() => {
    createPINWindow()
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createPINWindow()
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})