"use strict";
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
function attachBIOS(BIOS) {
    resetPlayButton();
    try {
        Iodine.attachBIOS(new Uint8Array(BIOS));
    }
    catch (error) {
        Iodine.attachBIOS(BIOS);
    }
}
function attachROM(ROM) {
    resetPlayButton();
    try {
        Iodine.attachROM(new Uint8Array(ROM));
    }
    catch (error) {
        Iodine.attachROM(ROM);
    }
}
function fileLoadShimCode(files, ROMHandler) {
    if (typeof files != "undefined") {
        if (files.length >= 1) {
            //Gecko 1.9.2+ (Standard Method)
            try {
                var binaryHandle = new FileReader();
                binaryHandle.onloadend = function () {
                    ROMHandler(this.result);
                }
                binaryHandle.readAsArrayBuffer(files[files.length - 1]);
            }
            catch (error) {
                try {
                    var result = files[files.length - 1].getAsBinary();
                    var resultConverted = [];
                    for (var index = 0; index < result.length; ++index) {
                        resultConverted[index] = result.charCodeAt(index) & 0xFF;
                    }
                    ROMHandler(resultConverted);
                }
                catch (error) {
                    alert("Could not load the processed ROM file!");
                }
            }
        }
    }
}
function fileLoadBIOS(remote) {
    if(typeof remote == 'boolean' && remote) {
        var bios = new Array();
        try {
            var req = new XMLHttpRequest();
            req.open('GET', '../../roms/gba.bin', true);
            req.responseType = 'blob';
            req.onload = function(event) {
                var blob = req.response;
                bios[0] = blob;
            };
            req.onloadend = function(event) {
                fileLoadShimCode(bios, attachBIOS);
                console.log('Loaded BIOS');
            };
            req.send();
        } catch(err) {
            console.log(err);
        }
    } else {
        fileLoadShimCode(this.files, attachBIOS);
    }
}
function fileLoadROM(remote, fileName) {
    if(typeof remote == 'boolean' && remote) {
        var game = new Array();
        try {
            var req = new XMLHttpRequest();
            req.open('GET', '../../roms/'+fileName, true);
            req.responseType = 'blob';
            req.onload = function(event) {
                var blob = req.response;
                game[0] = blob;
            };
            req.onloadend = function(event) {
                fileLoadShimCode(game, attachROM);
                console.log('Loaded game: '+fileName);
            };
            req.send();
        } catch(err) {
            console.log(err);
        }
    } else {
        fileLoadShimCode(this.files, attachROM);
    }
}
function downloadFile(fileName, registrationHandler) {
    var ajax = new XMLHttpRequest();
    ajax.onload = registrationHandler;
    ajax.open("GET", "./" + fileName, true);
    ajax.responseType = "arraybuffer";
    ajax.overrideMimeType("text/plain; charset=x-user-defined");
    ajax.send(null);
}
function processDownload(parentObj, attachHandler) {
    try {
        attachHandler(new Uint8Array(parentObj.response));
    }
    catch (error) {
        var data = parentObj.responseText;
        var length = data.length;
        var dataArray = [];
        for (var index = 0; index < length; index++) {
            dataArray[index] = data.charCodeAt(index) & 0xFF;
        }
        attachHandler(dataArray);
    }
}