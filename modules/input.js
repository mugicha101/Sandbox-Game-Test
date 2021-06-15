import {Music} from "./audio.js"
import * as ce from './canvasExtension.js';
import {MainLoop, debugEnabled} from './main.js';

document.addEventListener("keydown", keyDownHandler, false);
document.addEventListener("keyup", keyUpHandler, false);

/* For Combat:
    Hold and Release Left Click to throw yin-yang orb
    Testing: Right Click to spawn yyorb
*/

let c = ce.c;
let canvas = ce.canvas;

export let paused = false;

class InputHandler {
    constructor(keys=[]) {
        this.pressed = false;
        this.initialPress = false;
        this.initialRelease = false;
        this.keys = keys;
    }

    keyDown() {
        if (!this.pressed) this.initialPress = true;
        this.pressed = true;
    }

    keyUp() {
        if (this.pressed) this.initialRelease = true;
        this.pressed = false;
    }

    cycle() {
        this.initialPress = false;
        this.initialRelease = false;
    }
}

export function updateInputHandlers() {
    for (let i in inputs) {
        inputs[i].cycle();
    }
}

// SOURCE CODE: http://stackoverflow.com/questions/10338704/javascript-to-detect-if-user-changes-tab#:~:text=You%20can%20determine%20if%20a,focus%20event%20listener%20to%20window.&text=If%20you%20are%20targeting%20browsers,-say%2C%20but%20visibility%20changes.
// Set the name of the hidden property and the change event for visibility
var hidden, visibilityChange;
if (typeof document.hidden !== "undefined") { // Opera 12.10 and Firefox 18 and later support
  hidden = "hidden";
  visibilityChange = "visibilitychange";
} else if (typeof document.msHidden !== "undefined") {
  hidden = "msHidden";
  visibilityChange = "msvisibilitychange";
} else if (typeof document.webkitHidden !== "undefined") {
  hidden = "webkitHidden";
  visibilityChange = "webkitvisibilitychange";
}
if (typeof document.addEventListener !== "undefined" && hidden !== undefined) {
    document.addEventListener(visibilityChange, function() {
        if (document[hidden]) {
            console.log("untabbed")
            Music.changeVolume(0.1)
            unpressAll();
        } else {
            console.log("retabbed")
            Music.changeVolume(1)
            unpressAll();
        }
    }, false);
}

export const inputs = {
    up: new InputHandler(['w','uparrow']),
    down: new InputHandler(['s','downarrow']),
    left: new InputHandler(['a','leftarrow']),
    right: new InputHandler(['d','rightarrow']),
    debug: new InputHandler(['b']),
    consoleDebug: new InputHandler(['c']),
    sprint: new InputHandler([' ', 'shift']),
    interact: new InputHandler(['e']),
    farSight: new InputHandler(['x']),
    leftClick: new InputHandler(),
    middleClick: new InputHandler(),
    rightClick: new InputHandler(),
    zoomOut: new InputHandler(['o']),
    zoomIn: new InputHandler(['i'])
}

export function unpressAll() {
    for (let key in inputs) {
        inputs[key].pressed = false;
    }
}

function keyDownHandler(e) {
    try {
        // console.log(e.key)
        for(let i in inputs) {
            let ki = inputs[i];
            if (ki.keys.length === 0) continue;
            if (ki.keys.includes(e.key.toLowerCase())) {
                ki.keyDown();
            }
        }
        switch(e.key.toLowerCase()) {
            case "escape":
                if (debugEnabled) paused = !paused;
                break;
        }
    } catch(e) {
        console.log(e)
    }
}

function keyUpHandler(e) {
    // console.log(`/${e.key}`)
    try {
        for(let i in inputs) {
            let ki = inputs[i];
            if (ki.keys.length === 0) continue;
            if (ki.keys.includes(e.key.toLowerCase())) {
                ki.keyUp();
            }
        }
        switch(e.key.toLowerCase()) {
            
        }
    } catch(e) {
        console.log(e)
    }
}

export let mouseDown = false
canvas.addEventListener("mousedown", function(e) {
    try {
        switch (e.button) {
            case 0:
                inputs.leftClick.keyDown();
                break;
            case 1:
                inputs.middleClick.keyDown();
                break;
            case 2:
                inputs.rightClick.keyDown();
                break;
        }
        if (inputs.leftClick.pressed || inputs.middleClick.pressed || inputs.rightClick.pressed) mouseDown = true;
    } catch(e) {
        console.log(e);
    }
})

canvas.addEventListener("mouseup", function(e) {
    try {
        switch (e.button) {
            case 0:
                inputs.leftClick.keyUp();
                break;
            case 1:
                inputs.middleClick.keyUp();
                break;
            case 2:
                inputs.rightClick.keyUp();
                break;
        }
        if (!inputs.leftClick.pressed && !inputs.middleClick.pressed && !inputs.rightClick.pressed) mouseDown = false;
    } catch(e) {
        console.log(e);
    }
})

document.oncontextmenu = function() {
    return false;
}

function getMouseCoords(evt) {
    try {
        let rect = canvas.getBoundingClientRect()
        let x = evt.clientX - rect.left
        let y = evt.clientY - rect.top
        let windowDim = c.getWindowDim();
        x -= canvas.width/2;
        y -= canvas.height/2;
        x /= c.canvasScale;
        y /= c.canvasScale;
        return [
            x, y
        ]
    } catch(e) {
        console.log(e)
    }
}

export let mouseCoords = [0,0];
const mouseSnap = 0.75;
export function moveMouse() {
    for (let i = 0; i < 2; i++) {
        mouseCoords[i] += (trueMouseCoords[i] - mouseCoords[i]) * mouseSnap
    }
}
let trueMouseCoords = [0,0]
canvas.addEventListener("mousemove", function(evt) {
    trueMouseCoords = getMouseCoords(evt)
}, false)