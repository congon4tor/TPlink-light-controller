const electron = require("electron");
const url = require("url");
const path = require("path");
const TPLight = require('tplink-lightbulb')

const { app, BrowserWindow, Menu, ipcMain } = electron;

let lights = [];
const transition = 500;

//Listen for app to be ready
app.on('ready', function () {
    //Create new window
    let bounds = electron.screen.getPrimaryDisplay().bounds;
    let x = bounds.x + ((bounds.width - 700) / 2);
    let y = bounds.y + ((bounds.height - 900) / 2) + 50;
    mainWindow = new BrowserWindow({
        webPreferences: {
            nodeIntegration: true
        },
        width: 700,
        height: 900,
        x: x,
        y: y,
    });
    //Load html into window
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'mainWindow.html'),
        protocol: 'file:',
        slashes: true
    }));

    //Quit app on close
    mainWindow.on('closed', () => {
        mainWindow = null
        app.exit();
    })

    //Build menu from template
    const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
    //Insert menu
    Menu.setApplicationMenu(mainMenu);

    //devtools
    // mainWindow.webContents.openDevTools({ mode: 'detach' })
});

//triggered when view loaded
ipcMain.on('loaded', function (e) {
    scanLights();
});

//triggered with on/off toggle
ipcMain.on('powerToggle', function (e, state, ip) {
    powerLight(state, ip);
});

//triggered with color change
ipcMain.on('changeColor', function (e, state, hue, saturation, brightness, ip) {
    changeColor(state, hue, saturation, brightness, ip);
});

//triggered with temp change
ipcMain.on('changeTemp', function (e, state, temp, brightness, ip) {
    changeTemp(state, temp, brightness, ip);
});

//Create menu template
const mainMenuTemplate = [
    {
        label: 'File',
        submenu: [
            {
                label: 'Scan lights',
                accelerator: 'CmdOrCtrl+R',
                click() {
                    scanLights();
                }
            },
            {
                type: 'separator'
            },
            {
                label: 'Quit',
                accelerator: 'CmdOrCtrl+Q',
                click() {
                    app.quit();
                }
            }
        ]
    }
];

function scanLights() {
    // delete all lights
    lights = [];
    mainWindow.webContents.send('empty-lights');
    const scan = TPLight.scan()
        .on('light', light => {
            //add lights
            lights.push(light);
            mainWindow.webContents.send('light-found', light);
        });
}

function powerLight(state, ip) {
    // turn a light on/off
    let light = lights.find(light => light.ip == ip);
    light.power(state, transition)
        .then(status => {
            mainWindow.webContents.send('update-light', status, ip);
        })
        .catch(err => console.error(err))
}

function changeColor(state, hue, saturation, brightness, ip) {
    // change color
    let light = lights.find(light => light.ip == ip);
    light.power(state, transition, { color_temp: 0, hue, saturation, brightness })
        .then(status => {
            mainWindow.webContents.send('update-light', status, ip);
        })
        .catch(err => console.error(err))
}

function changeTemp(state, temp, brightness, ip) {
    // change temp
    let light = lights.find(light => light.ip == ip);
    light.power(state, transition, { color_temp: temp, hue: 0, saturation: 0, brightness: brightness })
        .then(status => {
            mainWindow.webContents.send('update-light', status, ip);
        })
        .catch(err => console.error(err))
}