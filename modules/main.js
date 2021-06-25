import * as ce from './canvasExtension.js';
import * as inp from './input.js';
import { inputs } from './input.js';
import { Player } from './player.js';
import { Map, Tile, TileType, BreakTracker } from './tileSystem.js';
import { Sound, SpatialSound, Music } from './audio.js';
import { WorldGen } from './worldGen.js';
import { PlayerInv, ItemType, TileItemType } from './inventory.js';
export { MainLoop, Draw, debug, consoleDebug, debugEnabled };

const canvas = ce.canvas
const c = canvas.getContext("2d", { alpha: false })
canvas.style.cursor = 'none';
const debugEnabled = true;
let debug = false;
let consoleDebug = false;

export let zoom = 10;
export let zoomTarget = 1;
export function changeZoom(amount, multi=true) {
    if (multi) {
        zoomTarget *= amount;
    } else {
        zoomTarget += amount;
    }
}

const TimeCost = {
    frameArr: [],
    inputStepArr: [],
    calcStepArr: [],
    drawStepArr: [],
    interval: 60
}

const MainLoop = { // main "clock" of the entire game
    fps: 60, // you can technically go above 60fps, but only the calculations will go above 60fps while the rendering will remain at 60fps
    lastFrameTimeMs: 0,
    delta: 0,
    cycles: 0,
    firstRefresh: true,
    musicCooldown: 5, // in seconds, gives music time to load before playing
    lastMusicPlayed: 0,
    lastCurrentTime: null,
    music: null,
    activeScene: "game",
    fpsArr: [],
    /* SCENES:
        game
    */
    /*
    =====================
    MAIN LOOP
        ||
        ||
        ||
       _||_
       \  /
        \/
    =====================
    */
    run: function (timestamp) {
        try {
            let fStartTime = performance.now();
            // limit framerate
            // skips frame if the time between the start of the previous frame is lower than what is required for maintaining the fps
            let timestep = 1000 / this.fps
            if (timestamp < this.lastFrameTimeMs + (1000 / this.fps)) {
                return 0;
            }
            if (MainLoop.cycles > 0) {
                this.fpsArr.push(1 / ((timestamp - this.lastFrameTimeMs) / 1000))
                while (this.fpsArr.length > this.fps) {
                    this.fpsArr.splice(0, 1);
                }
            }

            // track change in time since last update
            if (inp.paused) {
                this.delta = 0
            } else {
                // delta is the amount of time this animation frame has to account for. Basically the time the previous frame took to run.
                this.delta += timestamp - this.lastFrameTimeMs

                // if the amount of time the game needs to catch up on (in terms of calculations) exceeds 0.2 seconds, this will reduce the delta (aka: the time that the frame has to account for) back to 0. Prevents freezing when switching tabs or in case the processing speed on your computer is not high enough to maintain the fps;
                if (this.delta > timestep * this.fps * 0.2) {
                    this.delta = 0
                }
            }
            c.resizeCanvas();
            this.lastFrameTimeMs = timestamp;
            if (!inp.paused) {
                // Note: inputSequence runs only once per frame unlike mainSequence. It is useful for input calculations due to the initialPress & initialRelease properties of the inputHandlers only updating once per frame.
                let startTime = performance.now();
                Calculate.inputSequence(this.delta);
                let endTime = performance.now();
                TimeCost.inputStepArr.push(endTime - startTime);
                while (TimeCost.inputStepArr.length > TimeCost.interval) {
                    TimeCost.inputStepArr.splice(0, 1);
                }
                while (this.delta >= timestep && !(this.firstRefresh)) {
                    this.delta -= timestep
                    // Note: mainSequence runs multiple times per animation frame if the time a frame takes to run exceeds the fps cap to make up for lost time. Doing this allows the game to calculate at a higher framerate in case the drawing sequence causes lag, making the screen look more choppy (due to a lower rendering fps) instead of slowing the entire game.
                    startTime = performance.now();
                    Calculate.mainSequence(timestep);
                    endTime = performance.now();
                    TimeCost.calcStepArr.push(endTime - startTime);
                    while (TimeCost.calcStepArr.length > TimeCost.interval) {
                        TimeCost.calcStepArr.splice(0, 1);
                    }
                    this.cycles++;
                }

                // update the screen
                startTime = performance.now();
                Draw.mainSequence();
                endTime = performance.now();
                TimeCost.drawStepArr.push(endTime - startTime);
                while (TimeCost.drawStepArr.length > TimeCost.interval) {
                    TimeCost.drawStepArr.splice(0, 1);
                }
            }

            if (this.firstRefresh) {
                this.firstRefresh = false
                this.delta = 0
            }

            // play music
            // NOTE: music may stop playing suddenly and restart
            if (this.cycles % 15 === 0 && this.music != null) {
                let currentTime = this.music.currentTime
                if (this.lastCurrentTime == null) {
                    this.lastCurrentTime = currentTime;
                } else {
                    let deltaCT = currentTime - this.lastCurrentTime;
                    this.lastCurrentTime = currentTime;
                    // console.log(this.music.paused, Math.round(currentTime*1000)/1000, Math.round(deltaCT*1000)/1000)
                    if (timestamp > this.musicCooldown * 1000 && deltaCT === 0) {
                        console.log("MUSIC ERROR time:", currentTime)
                        this.music.currentTime = currentTime;
                    }
                }
            }
            if (this.music != null && timestamp > this.musicCooldown * 1000 && this.music.paused) {
                this.music.stop();
                this.lastCurrentTime = null;
                this.music.play();
                this.lastMusicPlayed = timestamp
            }

            // update InputHandler objects
            inp.updateInputHandlers();

            let fEndTime = performance.now();
            TimeCost.frameArr.push(fEndTime - fStartTime);
            while (TimeCost.frameArr.length > TimeCost.interval) {
                TimeCost.frameArr.splice(0, 1);
            }

            return 1;
        } catch (e) {
            console.log(`Error on cycle ${this.cycles}: `, e);
            return -1;
        }
    }
}

function getAvg(arr) {
    if (arr.length === 0) return null;
    let avg = 0;
    for (let i in arr) {
        avg += arr[i];
    }
    avg /= arr.length;
    return avg;
}

const Calculate = { // handles most of the calculation calls (runs exactly 60 times per second, if it takes longer than 1/60 of a second to run this step, the program can't keep up and will lag majorly)
    hasFocus: false,
    inputSequence: function (delta) { // input handling
        // debug
        this.debugToggle();
        inp.moveMouse();
        if (!document.hasFocus()) {
            inp.unpressAll();
        }

        // focus
        if (!this.hasFocus && document.hasFocus()) {
            console.log("focused");
        } else if (this.hasFocus && !document.hasFocus()) {
            console.log("unfocused");
        }
        this.hasFocus = document.hasFocus();

        // zoom
        this.zoomInput();

        // inventory
        if (inputs.inventory.initialPress)
            PlayerInv.open = !PlayerInv.open;
        PlayerInv.inputCalc();

        // break and place
        this.placeAndBreak();
        
    },
    zoomInput: function() {
        if (inputs.zoomIn.pressed) changeZoom(1.01);
        else if (inputs.zoomOut.pressed) changeZoom(1/1.01);
    },
    mainSequence: function (timestep) {
        SpatialSound.updateSoundPos();
        switch (MainLoop.activeScene) {
            case "game":
                this.gameSequence(timestep);
                break;
        }
        this.debugSequence();
    },
    gameSequence: function (timestep) {
        this.zoom();
        Player.move();
        BreakTracker.calc();
        PlayerInv.calc();
    },
    debugSequence: function () {
        if (consoleDebug && MainLoop.cycles % 60 === 0) {
            let mouseCoords = [
                inp.mouseCoords[0]/zoom+Player.camPos[0],
                -inp.mouseCoords[1]/zoom+Player.camPos[1]
            ]
            console.log("");
            console.log("cycle:", MainLoop.cycles);
            console.log("mouseCoords:", mouseCoords);
            let hoverTile = Map.getTileAt(mouseCoords, false);
            console.log("hovered tile:", hoverTile == null? "none" : (hoverTile.type == null? "air" : hoverTile.type.name));

            console.log((Math.round(getAvg(MainLoop.fpsArr) * 1000) / 1000).toString(), "fps")

            let avgFrameTime = getAvg(TimeCost.frameArr) * 1000;
            let frameTime = "frame: " + (Math.round(avgFrameTime * 1000) / 1000).toString() + "μs (" + (Math.round(avgFrameTime / (1 / MainLoop.fps * 1000)) / 10).toString() + "% fps limit)"

            let inputStepTime = "input step: " + (Math.round(getAvg(TimeCost.inputStepArr) * 1000000) / 1000).toString() + "μs"

            let calcStepTime = "calc step: " + (Math.round(getAvg(TimeCost.calcStepArr) * 1000000) / 1000).toString() + "μs"

            let drawStepTime = "draw step: " + (Math.round(getAvg(TimeCost.drawStepArr) * 1000000) / 1000).toString() + "μs"

            console.log(frameTime);
            console.log(inputStepTime, calcStepTime, drawStepTime);
            console.log("mouseCoords:", inp.mouseCoords);
            console.log("zoom:", zoom)
        }
    },
    debugToggle: function () {
        if (!debugEnabled) return;
        if (inputs.debug.initialPress) {
            debug = !debug;
        }
        if (inputs.consoleDebug.initialPress) {
            consoleDebug = !consoleDebug;
        }
    },
    zoom: function() {
        zoom += (zoomTarget - zoom)*0.2;
    },
    placeAndBreak: function() {
        if (PlayerInv.open) return;
        let mouseCoords = [
            inp.mouseCoords[0]/zoom+Player.camPos[0],
            -inp.mouseCoords[1]/zoom+Player.camPos[1]
        ]
        let targetCoords = [
            Math.floor(mouseCoords[0]/Tile.size),
            Math.floor(mouseCoords[1]/Tile.size)
        ]
        if (inputs.leftClick.pressed) {
            let bt = BreakTracker.getBreakTrackerAt(targetCoords, true);
            if (bt == null) {
                let tile = Map.getTileAt(targetCoords, true)
                if (tile != null && tile.type != null)
                    bt = new BreakTracker(tile);
            }
            if (bt instanceof BreakTracker)
                bt.advance();
        }
        
        if (PlayerInv.hbIndex != null && inputs.rightClick.initialPress) {
            let slot = PlayerInv.getActiveSlot();
            if (slot.item != null && slot.item.type instanceof TileItemType) {
                let targetTile = Map.getTileAt(mouseCoords, false);
                if (targetTile != null && targetTile.type == null) {
                    Map.setTileAt(mouseCoords, new Tile(slot.item.type.tileType), false);
                    slot.removeOneItem();
                }
            }
        }
    }
}

const Draw = { // handles most rendering calls (may run less than 60 times per second depending on the lag)
    layers: ["wall", "tile", "wiring", "inventory"],
    layerCanvases: {},
    drawLayerCanvas(layer, alpha=1) {
        c.resetTrans();
        if (alpha != 1) c.globalAlpha = alpha;
        c.drawImage(Draw.layerCanvases[layer], 0, 0);
        if (alpha != 1) c.globalAlpha = 1;
    },
    camCanvasOffset: function (ctx = null, doZoom=true) { // auto transforms canvas based on camPos
        if (ctx == null) ctx = c;
        let scale = (doZoom)? zoom : 1;
        ctx.transformCanvas(scale, 0, ce.screenDim[0] / 2 - Player.camPos[0]*scale, ce.screenDim[1] / 2 + Player.camPos[1]*scale)
    },
    mainSequence: function () { // render order
        this.resetCanvas();
        switch (MainLoop.activeScene) {
            case "game":
                this.background();
                this.gameSequence();
                break;
        }
    },
    gameSequence: function () {
        Map.draw();
        BreakTracker.draw();
        this.drawLayerCanvas("tile");
        Player.draw();
        PlayerInv.draw();
        this.drawInventoryLayer();
        this.cursor();
    },
    resetCanvas: function () { // clears the canvas
        c.resetTrans();
        c.clearRect(0, 0, ce.screenDim[0], ce.screenDim[1]);
        for (let id in Draw.layerCanvases) {
            Draw.layerCanvases[id].getContext('2d').resetTrans();
            Draw.layerCanvases[id].getContext('2d').clearRect(0, 0, ce.screenDim[0], ce.screenDim[1]);
        }
    },
    background: function () { // draws background
        c.resetTrans();
        c.fillStyle = "rgb(200,255,255)"
        c.fillRect(0, 0, ce.screenDim[0], ce.screenDim[1]);
    },
    loading: function () { // draws the load screen at the start
        c.resetTrans();
        c.transformCanvas(1, 0, ce.screenDim[0] / 2, ce.screenDim[1] / 2);
        c.font = "bold 200px Arial";
        c.textAlign = "center";
        c.fillStyle = "rgb(255,255,255)"
        c.fillText("Loading...", 0, 0)
        c.font = "50px Arial";
        c.fillText("Please reload if it takes longer than 30 seconds", 0, ce.screenDim[1]*0.1)
    },
    cursor: function () { // draws the cursor
        c.resetTrans();
        c.transformCanvas(1, 0, ce.screenDim[0] / 2 + inp.mouseCoords[0], ce.screenDim[1] / 2 + inp.mouseCoords[1]);
        c.fillStyle = "rgb(255,255,255)";
        c.globalCompositeOperation = "difference";
        let mouseSize = (inp.mouseDown)? 10 : 5
        c.fillCircle(0, 0, mouseSize / c.canvasScale);
        c.globalCompositeOperation = "source-over";
    },
    drawInventoryLayer() {
        let alpha = PlayerInv.open? 1 : 3-(MainLoop.cycles-PlayerInv.lastWheelCycle)/120;
        if (alpha < 0.5) alpha = 0.5;
        else if (alpha > 1) alpha = 1;
        this.drawLayerCanvas("inventory", PlayerInv.open? 1 : alpha);
    }
}
for (let i in Draw.layers) {
    let id = Draw.layers[i];
    Draw.layerCanvases[id] = ce.createCanvas(ce.screenDim[0], ce.screenDim[1])
}

window.onload = function () {
    console.log("Start")
    c.resizeCanvas();
    Sound.initSounds();

    // load audio and wait for mainLoop to initialize
    const load = setInterval(function () {
        let ready = true;
        for (let s in Sound.sounds) {
            if (!Sound.sounds[s].loadedMetadata) {
                ready = false;
            }
        }
        if (ready) {
            clearInterval(load);
            Music.changeMusic("title");
            MainLoop.activeScene = "game";
            Player.init();
            WorldGen.genSequence();
            PlayerInv.init();
            Player.goToSpawn();
            requestAnimationFrame(animationFrame);
        } else {
            c.resizeCanvas();
            Draw.loading();
        }
    }, 10)
}

function animationFrame(timestamp) {
    if (MainLoop.run(timestamp) === -1) return;
    requestAnimationFrame(animationFrame)
}