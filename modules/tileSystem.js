import * as ce from './canvasExtension.js';
const canvas = ce.canvas;
const c = canvas.getContext("2d", { alpha: false })
import {Graphic} from './graphics.js';
import {Player} from './player.js';
import {Collision, HitBox, HitCircle} from './collisions.js';
import {zoom, Draw, MainLoop} from './main.js';
export {Tile, TileType, Map, BreakTracker};

class TileType {
    constructor(name, graphic, tools=[], breakTime=null, blastRes=null, hasHitbox=true) {
        this.graphic = graphic;
        this.name = name;
        this.tools = tools;
        this.breakTime = breakTime;
        this.blastRes = blastRes;
        this.hasHitbox = hasHitbox;
    }

    static types = {
        grass: new TileType("grass", new Graphic("../graphics/tiles/grass", ["tile"], ".png", 0.25), ["shovel"], 0.6, 1.2, true),
        dirt: new TileType("dirt", new Graphic("../graphics/tiles/dirt", ["tile"], ".png", 0.25), ["shovel"], 0.5, 1, true),
        stone: new TileType("stone", new Graphic("../graphics/tiles/stone", ["tile"], ".png", 0.25), ["pick"], 5, 5, true),
        stone_brick: new TileType("stone brick", new Graphic("../graphics/tiles/stone_brick", ["tile"], ".png", 0.25), ["pick"], 7, 7, true),
        log: new TileType("log", new Graphic("../graphics/tiles/log", ["tile"], ".png", 0.25), ["axe"], 3, 3, false),
        leaves: new TileType("leaves", new Graphic("../graphics/tiles/leaves", ["tile"], ".png", 0.25), ["axe"], 0.5, 0.25, true),
    }
}

class Tile {
    static size = 64;
    constructor(type, pos=[0,0]) {
        this.type = type;
        this.pos = pos;
        this.hb = new HitBox(pos, [Tile.size, Tile.size], true, false)
    }

    draw() {
        if (this.type != null)
            this.type.graphic.draw([this.pos[0], this.pos[1]]);
    }

    updateHitbox() {
        this.hb.pos = this.pos;
    }

    replace(tile, usePrevPos=true) {
        this.type = tile.type;
        if (!usePrevPos) {
            this.pos = tile.pos;
            this.updateHitbox();
        }
    }
}

// chunks can contain other chunks (Boundary Volume Heirarchy)
// allows faster tile collision
// each chunk is 2x2 nodes
// pos refers to bottom left corner
class Chunk {
    constructor(pos=[0,0], nodes=[], baseLevel=false, hb=new HitBox([0,0],[0,0], false, true)) {
        this.pos = pos;
        this.nodes = nodes;
        this.baseLevel = baseLevel;
        this.hb = hb;
    }
}

// map holds functionality for tile system
const Map = {}
Map.dim = [0,0];
Map.noise = new SimplexNoise();

Map.create = function(parentChunk=null) {
    if (parentChunk == null) { // default map
        // recursive function to create BVH
        let tileCount = 0;
        let createNodes = function(parent, level) {
            for (let i = 0; i < 2; i++) {
                let row = [];
                for (let j = 0; j < 2; j++) {
                    let pos = [
                        parent.pos[0] + Tile.size*(2**level)*i,
                        parent.pos[1] + Tile.size*(2**level)*j,
                    ]
                    if (level == 0) {
                        parent.nodes.push(new Tile(null, pos));
                        tileCount++;
                    } else {
                        parent.nodes.push(createNodes(new Chunk(pos, [], (level == 1), new HitBox(pos, [Tile.size*(2**(level+1)), Tile.size*(2**(level+1))], false)), level-1));
                    }
                }
            }
            return parent;
        }
        let level = 8;
        parentChunk = createNodes(new Chunk([0,0], [], false, new HitBox([0,0], [Tile.size*(2**(level+1)), Tile.size*(2**(level+1))], false)), level);
        console.log(tileCount);
    }
    Map.parentChunk = parentChunk;
    Map.dim = [parentChunk.hb.dim[0], parentChunk.hb.dim[1]];
}

Map.getTilesInBounds = function(colObj, onlySolidBlocks=false) {
    let tiles = [];
    let checkNodes = function(parent) {
        if (Collision.isTouching(colObj, parent.hb).overlap) {
            if (parent instanceof Tile) {
                if (parent.type != null)
                    if (!onlySolidBlocks || parent.type.hasHitbox)
                        tiles.push(parent);
            } else {
                for (let i = 0; i < parent.nodes.length; i++)
                    checkNodes(parent.nodes[i]);
            }
        }
    }
    checkNodes(Map.parentChunk);
    return tiles;
}

Map.draw = function() {
    let screenDim = [ce.screenDim[0]/zoom, ce.screenDim[1]/zoom]
    let screenBox = new HitBox([Player.camPos[0]-screenDim[0]/2, -screenDim[1]/2+Player.camPos[1]], screenDim)
    let tiles = Map.getTilesInBounds(screenBox);
    Draw.camCanvasOffset(Draw.layerCanvases["tile"].getContext('2d'));
    //console.log(tiles.length)
    for (let i = 0; i < tiles.length; i++) {
        tiles[i].draw();
    }
}

Map.getTileAt = function(pos, tileUnits=true) {
    if (tileUnits) {
        pos[0] *= Tile.size;
        pos[1] *= Tile.size;
    }
    let tile = null;
    let checkNodes = function(parent) {
        let bounds = parent.hb.getBounds();
        if (pos[0] >= bounds[0] && pos[1] >= bounds[1] && pos[0] < bounds[2] && pos[1] < bounds[3]) {
            if (parent instanceof Tile) {
                tile = parent;
                return true;
            } else {
                for (let i = 0; i < parent.nodes.length; i++)
                    if (checkNodes(parent.nodes[i]))
                        return true;
            }
        }
        return false;
    }

    checkNodes(Map.parentChunk)
    return tile;
}

Map.setTileAt = function(pos, tile, tileUnits=true) {
    if (tileUnits) {
        pos[0] *= Tile.size;
        pos[1] *= Tile.size;
    }

    let checkNodes = function(parent) {
        let bounds = parent.hb.getBounds();
        if (pos[0] >= bounds[0] && pos[1] >= bounds[1] && pos[0] < bounds[2] && pos[1] < bounds[3]) {
            if (parent instanceof Tile) { // found tile
                parent.replace(tile);
                return true;
            } else {
                for (let i = 0; i < parent.nodes.length; i++)
                    if (checkNodes(parent.nodes[i]))
                        return true;
            }
        }
        return false;
    }

    return checkNodes(Map.parentChunk)
}

Map.loopThroughTiles = function(funct = function(tile) {}) {
    let lttRecurse = function(parent) {
        for (let i = 0; i < parent.nodes.length; i++) {
            if (!(parent.nodes[i] instanceof Chunk)) {
                funct(parent.nodes[i], parent, i);
            } else {
                lttRecurse(parent.nodes[i]);
            }
        }
    }
    lttRecurse(Map.parentChunk);
}

// keeps track of a tile being broken
// used for breaking action and animation
// gradually disappears if enough time passes without the breaking progressing
class BreakTracker {
    static btDict = {};

    static graphic = new Graphic("../graphics/crack", ["tile"], ".png", 0.5, 8)

    static calc() {
        for (let key in BreakTracker.btDict) {
            BreakTracker.btDict[key].update();
        }
    }

    static draw() {
        let lCanvas = Draw.layerCanvases["tile"];
        let lCtx = lCanvas.getContext('2d');
        lCtx.resetTrans();
        lCtx.globalCompositeOperation = "destination-out";
        Draw.camCanvasOffset(lCtx);
        for (let key in BreakTracker.btDict) {
            BreakTracker.btDict[key].draw();
        }
        lCtx.globalCompositeOperation = "source-over";
    }
    
    static getBreakTrackerAt(pos, tileUnits=true) {
        let key = tileUnits? `${Math.floor(pos[0])},${Math.floor(pos[1])}` : `${Math.floor(pos[0]/Tile.size)},${Math.floor(pos[1]/Tile.size)}`;
        if (key in BreakTracker.btDict)
            return BreakTracker.btDict[key];
        else
            return null;
    }

    constructor(tile) {
        this.tile = tile;
        this.progress = 0;
        this.lastAdvanceCycle = MainLoop.cycles;
        this.key = `${Math.floor(tile.pos[0]/Tile.size)},${Math.floor(tile.pos[1]/Tile.size)}`;
        BreakTracker.btDict[this.key] = this;
    }

    advance(breakSpeed=1) {
        this.progress += breakSpeed/this.tile.type.breakTime/60;
        this.lastAdvanceCycle = MainLoop.cycles;
        if (this.progress >= 1) {
            this.tile.replace(new Tile(null));
            this.remove();
        }
    }

    remove() {
        delete BreakTracker.btDict[this.key];
    }

    update() { // runs every tick
        if (MainLoop.cycles - this.lastAdvanceCycle > 10*60 && Math.random() < 0.01) {
            this.progress -= Math.random()*0.1;
        }
    }

    draw() {
        if (this.progress > 0) {
            BreakTracker.graphic.frameIndex = Math.floor(this.progress*8);
            BreakTracker.graphic.draw([this.tile.pos[0], this.tile.pos[1]]);
        }
    }
}