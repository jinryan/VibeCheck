const electron = require('electron')
const { ipcMain, app, BrowserWindow, screen } = electron;

let popupWindow, pinWindow;

ipcMain.on('popup::expand', async function (e, total) {
    popupWindow.setSize(400, 700);
    // console.log("Current pct slouch is " + currentUserData["today"]["pct"])
    // win.webContents.send('settings:config', userConfig, currentUserData)
})

ipcMain.on('popup::reset', async function (e, total) {
    pinWindow.webContents.send('popup:reset', true)
    // console.log("Current pct slouch is " + currentUserData["today"]["pct"])
    // win.webContents.send('settings:config', userConfig, currentUserData)
})

ipcMain.on('popup::collapse', async function (e, total) {
    popupWindow.setSize(80, 80);
    // console.log("Current pct slouch is " + currentUserData["today"]["pct"])
    // win.webContents.send('settings:config', userConfig, currentUserData)
})

ipcMain.on('pin::success', async function (e, success) {
    createPopUpWindow();
})

ipcMain.on('pin::studentCount', async function (e, studentCount) {
    popupWindow.webContents.send('pin:studentCount', studentCount)
})

ipcMain.on('pin::questionUpdate', async function (e, questions) {
    popupWindow.webContents.send('pin:questionUpdate', questions)
})

ipcMain.on('pin::confusionUpdate', async function (e, confusions) {
    popupWindow.webContents.send('pin:confusionUpdate', confusions)
})

ipcMain.on('pin::slowDownUpdate', async function (e, slowDowns) {
    popupWindow.webContents.send('pin:slowDownUpdate', slowDowns)
})

ipcMain.on('pin::speedUpUpdate', async function (e, speedUps) {
    popupWindow.webContents.send('pin:speedUpUpdate', speedUps)
})



const createPopUpWindow = () => {
    var monitorSize = screen.getPrimaryDisplay().workAreaSize;
    width = monitorSize.width;
    height = monitorSize.height;

    popupWindow = new BrowserWindow({
        x: 100,
        y: 100,
        width: 80,
        height: 80,
        frame: false,
        transparent: true,
        minimizable: false,
        maximizable: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true,
        },
    })
    popupWindow.setResizable(false)
    popupWindow.setVisibleOnAllWorkspaces(true);
    popupWindow.setAlwaysOnTop(true, 'floating');
    popupWindow.loadFile('session.html')

}

const createPINGenerationWindow = () => {
    pinWindow = new BrowserWindow({
        width: 400,
        height: 500,
        // closable: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true,
        },
    })
    
    pinWindow.loadFile('index.html')
}

app.whenReady().then(() => {
    createPINGenerationWindow()
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createPINGenerationWindow()
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})