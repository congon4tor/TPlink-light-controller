const electron = require("electron");
const url = require("url");
const path = require("path");
const storage = require("electron-json-storage");
const TPLight = require('tplink-lightbulb')

const { app, BrowserWindow, Menu, ipcMain } = electron;

let lights = [];
let scenes = [];
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
    loadScenes();
});

//triggered with on/off toggle
ipcMain.on('powerToggle', function (e, state, ip) {
    powerLight(state, ip);
});

//triggered with color change
ipcMain.on('changeColor', function (e, state, hue, saturation, brightness, ip) {
    changeLight(state, 0, hue, saturation, brightness, ip);
});

//triggered with temp change
ipcMain.on('changeTemp', function (e, state, temp, brightness, ip) {
    changeLight(state, temp, 0, 0, brightness, ip);
});

//triggered with add scene
ipcMain.on('addScene', function (e, name) {
    addScene(name);
});

//triggered with delete scene
ipcMain.on('deleteScene', function (e, index) {
    deleteScene(index);
});

//triggered with update scene
ipcMain.on('updateScene', function (e, index) {
    updateScene(index);
});

//triggered with set scene
ipcMain.on('setScene', function (e, index) {
    _lights = scenes[index].lights
    for (const [index, light] of _lights.entries()) {
        _on_off = light._sysinfo.light_state.on_off
        _color_temp = (_on_off) ? light._sysinfo.light_state.color_temp : 0
        _hue = (_on_off) ? light._sysinfo.light_state.hue : 0
        _saturation = (_on_off) ? light._sysinfo.light_state.saturation : 0
        _brightness = (_on_off) ? light._sysinfo.light_state.brightness : 0
        changeLight(_on_off, _color_temp, _hue, _saturation, _brightness, light.ip);
        sleep(500)
    }
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

function loadScenes() {
    // delete all scenes
    scenes = [];
    storage.get('scenes', function (error, data) {
        if (!error) {
            // load scenes
            scenes = data;
            mainWindow.webContents.send('scenes-loaded', scenes);
        }
    });
}

function addScene(name) {
    let scene = { name: name, lights: lights };
    scenes.push(scene);
    storage.set('scenes', scenes, function (error) {
        if (error) console.error(err);
        loadScenes()
    });

}

function deleteScene(index) {
    scenes.splice(index, 1);
    storage.set('scenes', scenes, function (error) {
        if (error) console.error(err);
        loadScenes()
    });
}

function updateScene(index) {
    let scene = { name: scenes[index].name, lights: lights };
    scenes[index] = scene;
    storage.set('scenes', scenes, function (error) {
        if (error) console.error(err);
        loadScenes()
    });
}

function powerLight(state, ip) {
    // turn a light on/off
    var light = lights.find(light => light.ip == ip);
    let index = lights.indexOf(light);

    if (state !== (light._sysinfo.light_state.on_off == 1) ? true : false) {
        light.power(state, transition)
            .then(status => {
                mainWindow.webContents.send('update-light', status, ip);
                //update light obj
                light._sysinfo.light_state.on_off = status.on_off
                lights[index] = light;
            })
            .catch(err => console.error(err))
    }

}

function changeLight(state, color_temp, hue, saturation, brightness, ip) {
    // change color
    let light = lights.find(light => light.ip == ip);
    let index = lights.indexOf(light);

    light.power(state, transition, { color_temp: color_temp, hue, saturation, brightness })
        .then(status => {
            mainWindow.webContents.send('update-light', status, ip);
            //update light obj
            light._sysinfo.light_state.on_off = status.on_off
            light._sysinfo.light_state.color_temp = status.color_temp
            light._sysinfo.light_state.hue = status.hue
            light._sysinfo.light_state.saturation = status.saturation
            light._sysinfo.light_state.brightness = status.brightness
            lights[index] = light;
        })
        .catch(err => console.error(err))

}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}