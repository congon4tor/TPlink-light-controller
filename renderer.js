const { ipcRenderer } = require('electron');

let lights = [];
let scenes = [];
let colorPicker;
let tempSlider;
let brightnessSlider;
let eventChangeEnabled = true;

ipcRenderer.on('empty-lights', function (e) {
    lights = [];
    $('#light-select').empty();
});

ipcRenderer.on('light-found', function (e, light) {
    lights.push(light);
    $('#light-select').append(new Option(light.name, JSON.stringify(light)));
    //if light selected update gui
    if (JSON.parse($('#light-select').val()).ip == light.ip) {
        if (light._sysinfo.light_state.on_off == 1) {
            $('#powerToggle').bootstrapToggle('on')
        } else {
            $('#powerToggle').bootstrapToggle('off')
        }
        if ((light._sysinfo.light_state.on_off == 1 ? light._sysinfo.light_state.color_temp : light._sysinfo.light_state.dft_on_state.color_temp) == 0) {
            //color mode
            $('#color-tab').tab('show');
            colorPicker.color.hsl = { h: (light._sysinfo.light_state.on_off == 1 ? light._sysinfo.light_state.hue : light._sysinfo.light_state.dft_on_state.hue), s: (light._sysinfo.light_state.on_off == 1 ? light._sysinfo.light_state.saturation : light._sysinfo.light_state.dft_on_state.saturation), l: (light._sysinfo.light_state.on_off == 1 ? light._sysinfo.light_state.brightness : light._sysinfo.light_state.dft_on_state.brightness) };
        } else {
            //temp mode
            $('#temp-tab').tab('show');
            tempSlider.bootstrapSlider("setValue", (light._sysinfo.light_state.on_off == 1 ? light._sysinfo.light_state.color_temp : light._sysinfo.light_state.dft_on_state.color_temp), true, false);
            brightnessSlider.bootstrapSlider("setValue", (light._sysinfo.light_state.on_off == 1 ? light._sysinfo.light_state.brightness : light._sysinfo.light_state.dft_on_state.brightness), true, false);
            colorPicker.color.hsl = { h: (light._sysinfo.light_state.on_off == 1 ? light._sysinfo.light_state.hue : light._sysinfo.light_state.dft_on_state.hue), s: (light._sysinfo.light_state.on_off == 1 ? light._sysinfo.light_state.saturation : light._sysinfo.light_state.dft_on_state.saturation), l: (light._sysinfo.light_state.on_off == 1 ? light._sysinfo.light_state.brightness : light._sysinfo.light_state.dft_on_state.brightness) };
        }
    }
});

ipcRenderer.on('scenes-loaded', function (e, _scenes) {
    scenes = _scenes;
    $('#add-scene-alert').hide(0);
    $('#scenes-table > tbody').empty();
    for (const [index, scene] of scenes.entries()) {
        let row = '<tr><td class="w-75 scene-name" data-id="'+index+'">' + scene.name + '</td><td class="w-25">' + 
                '<a href="#" class="action-btn action-btn-delete mr-3" data-id="'+index+'" ><i class="fas fa-trash"></i></a>' + 
                '<a href="#" class="action-btn action-btn-update"  data-id="'+index+'" ><i class="fas fa-sync-alt"></i></a>' + 
                '</td></tr>';
        $('#scenes-table > tbody:last-child').append(row);
    }
});

ipcRenderer.on('update-light', function (e, msg, ip) {
    let light = lights.find(light => light.ip == ip);
    let index = lights.indexOf(light);
    //update light obj
    lights[index]._sysinfo.light_state.on_off = msg.on_off;
    lights[index]._sysinfo.light_state.brightness = (msg.on_off == 1 ? msg.brightness : msg.dft_on_state.brightness);
    lights[index]._sysinfo.light_state.color_temp = (msg.on_off == 1 ? msg.color_temp : msg.dft_on_state.color_temp);
    lights[index]._sysinfo.light_state.hue = (msg.on_off == 1 ? msg.hue : msg.dft_on_state.hue);
    lights[index]._sysinfo.light_state.saturation = (msg.on_off == 1 ? msg.saturation : msg.dft_on_state.saturation);
    lights[index]._sysinfo.light_state.mode = (msg.on_off == 1 ? msg.mode : msg.dft_on_state.mode);
    //if light selected update GUI
    if (JSON.parse($('#light-select').val()).ip == ip) {
        //disable event change
        eventChangeEnabled = false;
        if (light._sysinfo.light_state.on_off == 1) {
            $('#powerToggle').bootstrapToggle('on')
        } else {
            $('#powerToggle').bootstrapToggle('off')
        }
        colorPicker.color.hsl = { h: (msg.on_off == 1 ? msg.hue : msg.dft_on_state.hue), s: (msg.on_off == 1 ? msg.saturation : msg.dft_on_state.saturation), l: (msg.on_off == 1 ? msg.brightness : msg.dft_on_state.brightness) };
        //enable event change
        eventChangeEnabled = true;
    }
});

$(document).ready(function () {

    $('#powerToggle').bootstrapToggle();

    $('#powerToggle').change(function () {
        if (eventChangeEnabled) {
            ipcRenderer.send('powerToggle', $(this).prop('checked'), JSON.parse($('#light-select').val()).ip);
        }
    });

    $("#light-select").change(function () {
        //light selection changed update gui
        let ip = JSON.parse($('#light-select').val()).ip;
        let light = lights.find(light => light.ip == ip);
        let color_temp;
        let hue;
        let saturation;
        let brightness;
        if (light._sysinfo.light_state.on_off == 1) {
            $('#powerToggle').bootstrapToggle('on')
        } else {
            $('#powerToggle').bootstrapToggle('off')
        }
        if (!light._sysinfo.light_state.dft_on_state) {
            color_temp = light._sysinfo.light_state.color_temp;
            hue = light._sysinfo.light_state.hue;
            saturation = light._sysinfo.light_state.saturation;
            brightness = light._sysinfo.light_state.brightness;
        } else {
            color_temp = light._sysinfo.light_state.dft_on_state.color_temp;
            hue = light._sysinfo.light_state.dft_on_state.hue;
            saturation = light._sysinfo.light_state.dft_on_state.saturation;
            brightness = light._sysinfo.light_state.dft_on_state.brightness;
        }
        if (color_temp == 0) {
            //color mode
            $('#color-tab').tab('show');
            colorPicker.color.hsl = { h: hue, s: saturation, l: brightness };
        } else {
            //temp mode
            $('#temp-tab').tab('show');
            tempSlider.bootstrapSlider("setValue", color_temp, true, false);
            brightnessSlider.bootstrapSlider("setValue", brightness, true, false);
            colorPicker.color.hsl = { h: hue, s: saturation, l: brightness };
        }
    });

    // Create a slider for temp
    tempSlider = $("#temp-slider").bootstrapSlider({
        id: 'tempSlider',
        min: 2500,
        max: 9000,
        step: 1,
        precision: 0,
        orientation: 'vertical',
        rangeHighlights: [{ 'start': 2500, 'end': 9000, 'class': 'temp-range' }],
    });

    tempSlider.on('change', function (e) {
        ipcRenderer.send('changeTemp', true, e.value.newValue, brightnessSlider.bootstrapSlider('getValue'), JSON.parse($('#light-select').val()).ip);
    });

    // Create a slider for brightness
    brightnessSlider = $("#brightness-slider").bootstrapSlider({
        id: 'brightnessSlider',
        min: 0,
        max: 100,
        reversed: true,
        step: 1,
        precision: 0,
        orientation: 'vertical',
        rangeHighlights: [{ 'start': 0, 'end': 100, 'class': 'brightness-range' }],
    });

    brightnessSlider.on('change', function (e) {
        ipcRenderer.send('changeTemp', true, tempSlider.bootstrapSlider('getValue'), e.value.newValue, JSON.parse($('#light-select').val()).ip);
    });

    // Create a new color picker instance
    colorPicker = new iro.ColorPicker(".colorPicker", {
        // color picker options
        width: 280,
        color: "rgb(255, 0, 0)",
        borderWidth: 1,
        borderColor: "#fff",
        wheelDirection: "clockwise",
        wheelAngle: 270
    });

    colorPicker.on("input:change", function (color) {
        ipcRenderer.send('changeColor', true, color.hsl.h, color.hsl.s, color.hsl.l, JSON.parse($('#light-select').val()).ip);
    });


    $("#add-scene-btn").click(function (e) {
        e.preventDefault();
        let scene = scenes.find(scene => scene.name == $("#scene-name-input").val());
        if (!scene) {
            ipcRenderer.send('addScene', $("#scene-name-input").val());
        } else {
            $('#add-scene-alert').show(0);
        }
    });


    $(document).on( 'click', ".action-btn-delete", function(e){
        ipcRenderer.send('deleteScene', $(this).data("id"));
    } );

    $(document).on( 'click', ".action-btn-update", function(e){
        ipcRenderer.send('updateScene', $(this).data("id"));
    } );

    $(document).on( 'click', ".scene-name", function(e){
        ipcRenderer.send('setScene', $(this).data("id"));
    } );

    $('[data-toggle="tooltip"]').tooltip();

    //send finish loading
    ipcRenderer.send('loaded');
});
