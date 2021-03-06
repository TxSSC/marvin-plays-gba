/*
 * This file is part of IodineGBA
 *
 * Copyright (C) 2012-2013 Grant Galitz
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * version 2 as published by the Free Software Foundation.
 * The full license is available at http://www.gnu.org/licenses/gpl.html
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 */
var Iodine = null;
var Blitter = null;
var Mixer = null;
var MixerInput = null;
var timerID = null;
var server = new EventSource("/events");
var commandQueue = [];

/**
 * Process queue if there is anything, otherwise return
 *  - Ran every second
 *  - emulates a keypress for 400ms
 */

function processQueue() {
  if(commandQueue.length === 0) return;

  var keyCode = commandQueue.shift();
  keyDown(null, keyCode);
  setTimeout(keyUp.bind(null, null, keyCode), 200);
}

window.onload = function () {
    var keys = {
      'UP':38,
      'DOWN':40,
      'LEFT':37,
      'RIGHT':39,
      'A':88,
      'B':90,
      'L':49,
      'R':50,
      'START':13,
      'SELECT':16
    };

    server.addEventListener('load', function (data) {
      // console.log('Received load request: '+data.data+'.gba');
      fileLoadBIOS(true);
      fileLoadROM(true, data.data+'.gba');

      setTimeout( function () {
        Iodine.play();
        document.getElementById("play").style.display = "none";
        document.getElementById("pause").style.display = "inline";
      }, 1000);
    });

    server.addEventListener('push', function (data) {
      var commands = data.data.split(' '),
          num = parseInt(commands[1], 10);

      if(num > 20) {
        num = 20;
      }

      for(var i = 0; i < num; i++) {
        if(keys[commands[0].toUpperCase()]) {
          commandQueue.push(keys[commands[0].toUpperCase()]);
        }
      }
    });

    // Start looking for commands
    setInterval(processQueue, 250);

    //Initialize Iodine:
    Iodine = new GameBoyAdvanceEmulator();
    //Initialize the graphics:
    registerBlitterHandler();
    //Initialize the audio:
    registerAudioHandler();
    //Register the save handler callbacks:
    registerSaveHandlers();
    //Hook the GUI controls.
    registerGUIEvents();
};

function registerBlitterHandler() {
    Blitter = new GlueCodeGfx();
    Blitter.attachCanvas(document.getElementById("emulator_target"));
    Iodine.attachGraphicsFrameHandler(function (buffer) {Blitter.copyBuffer(buffer);});
}
function registerAudioHandler() {
    Mixer = new GlueCodeMixer();
    MixerInput = new GlueCodeMixerInput(Mixer);
    Iodine.attachAudioHandler(MixerInput);
}
function registerGUIEvents() {
    addEvent("keydown", document, keyDown);
    addEvent("keyup", document, keyUpPreprocess);
    addEvent("change", document.getElementById("rom_load"), fileLoadROM);
    addEvent("change", document.getElementById("bios_load"), fileLoadBIOS);
    addEvent("click", document.getElementById("play"), function (e) {
        Iodine.play();
        this.style.display = "none";
        document.getElementById("pause").style.display = "inline";
        e.preventDefault();
    });
    addEvent("click", document.getElementById("pause"), function (e) {
        Iodine.pause();
        this.style.display = "none";
        document.getElementById("play").style.display = "inline";
        e.preventDefault();
    });
    addEvent("click", document.getElementById("restart"), function (e) {
        Iodine.restart();
        e.preventDefault();
    });
    document.getElementById("sound").checked = false;
    addEvent("click", document.getElementById("sound"), function () {
        if (this.checked) {
            Iodine.enableAudio();
        }
        else {
            Iodine.disableAudio();
        }
    });
    document.getElementById("skip_boot").checked = true;
    addEvent("click", document.getElementById("skip_boot"), function () {
             Iodine.toggleSkipBootROM(this.checked);
    });
    document.getElementById("lle_jit").checked = true;
    addEvent("click", document.getElementById("lle_jit"), function () {
             Iodine.toggleDynarec(this.checked);
    });
    document.getElementById("lineskip").checked = false;
    addEvent("click", document.getElementById("lineskip"), function () {
             Iodine.toggleLineSkip(this.checked);
    });
    document.getElementById("toggleSmoothScaling").checked = false;
    addEvent("click", document.getElementById("toggleSmoothScaling"), function () {
             if (Blitter) {
                Blitter.setSmoothScaling(this.checked);
             }
    });
    document.getElementById("toggleDynamicSpeed").checked = true;
    addEvent("click", document.getElementById("toggleDynamicSpeed"), function () {
             Iodine.toggleDynamicSpeed(this.checked);
    });
    addEvent("change", document.getElementById("import"), function (e) {
             if (typeof this.files != "undefined") {
                try {
                    if (this.files.length >= 1) {
                        writeRedTemporaryText("Reading the local file \"" + this.files[0].name + "\" for importing.");
                        try {
                            //Gecko 1.9.2+ (Standard Method)
                            var binaryHandle = new FileReader();
                            binaryHandle.onload = function () {
                                if (this.readyState == 2) {
                                    writeRedTemporaryText("file imported.");
                                    try {
                                        import_save(this.result);
                                    }
                                    catch (error) {
                                        writeRedTemporaryText(error.message + " file: " + error.fileName + " line: " + error.lineNumber);
                                    }
                                }
                                else {
                                    writeRedTemporaryText("importing file, please wait...");
                                }
                            }
                            binaryHandle.readAsBinaryString(this.files[this.files.length - 1]);
                        }
                        catch (error) {
                            //Gecko 1.9.0, 1.9.1 (Non-Standard Method)
                            var romImageString = this.files[this.files.length - 1].getAsBinary();
                            try {
                                import_save(romImageString);
                            }
                            catch (error) {
                                writeRedTemporaryText(error.message + " file: " + error.fileName + " line: " + error.lineNumber);
                            }
                        }
                    }
                    else {
                        writeRedTemporaryText("Incorrect number of files selected for local loading.");
                    }
                }
                catch (error) {
                    writeRedTemporaryText("Could not load in a locally stored ROM file.");
                }
             }
             else {
                writeRedTemporaryText("could not find the handle on the file to open.");
             }
             e.preventDefault();
    });
    addEvent("click", document.getElementById("export"), refreshStorageListing);
    addEvent("unload", window, ExportSave);
    Iodine.attachSpeedHandler(function (speed) {
        var speedDOM = document.getElementById("speed");
        speedDOM.textContent = "Speed: " + speed;
    });
    //setInterval(ExportSave, 60000); //Do periodic saves.
}
function resetPlayButton() {
    document.getElementById("pause").style.display = "none";
    document.getElementById("play").style.display = "inline";
}
function lowerVolume() {
    var emuVolume = Math.max(Iodine.getVolume() - 0.04, 0);
    Iodine.changeVolume(emuVolume);
}
function raiseVolume() {
    var emuVolume = Math.min(Iodine.getVolume() + 0.04, 1);
    Iodine.changeVolume(emuVolume);
}
function writeRedTemporaryText(textString) {
    if (timerID) {
        clearTimeout(timerID);
    }
    document.getElementById("tempMessage").style.display = "block";
    document.getElementById("tempMessage").textContent = textString;
    timerID = setTimeout(clearTempString, 5000);
}
function clearTempString() {
    document.getElementById("tempMessage").style.display = "none";
}
//Some wrappers and extensions for non-DOM3 browsers:
function addEvent(sEvent, oElement, fListener) {
    try {
        oElement.addEventListener(sEvent, fListener, false);
    }
    catch (error) {
        oElement.attachEvent("on" + sEvent, fListener);    //Pity for IE.
    }
}
function removeEvent(sEvent, oElement, fListener) {
    try {
        oElement.removeEventListener(sEvent, fListener, false);
    }
    catch (error) {
        oElement.detachEvent("on" + sEvent, fListener);    //Pity for IE.
    }
}
