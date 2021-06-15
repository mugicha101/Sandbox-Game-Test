import { MainLoop, Draw, zoom } from './main.js';
import * as ce from './canvasExtension.js';
import { Collision, HitBox, HitCircle } from './collisions.js';
import { Player } from './player.js';
export { Graphic };

class Graphic { // image but can animate and assign to renderlayers and stuff
    static imgDict = {}; // stores all images for all graphics to allow reuse where possible
    static gCount = 0;
    layers = []; // list of renderlayers it is displayed on
    frames = []; // list of images that the graphic cycles through
    fps = 8; // amount of frames per second (if animation)
    offset = [0, 0]; // offset of image (used during render)
    constructor(imagePath, layers, extension = ".png", scale = 1, frameCount = 1, fps = 10, offset = [0, 0, 0], alpha = 1, frameIndex = null, behindFade=true) {
        // first 2 nums of offset are x and y offset
        // 3rd num is the distance from bottom of image to y boundary of the object (center of object's y offset), helps with renderorder
        while (offset.length < 3) {
            offset.push(0);
        }
        Graphic.gCount++;
        this.initData = {
            imagePath: imagePath,
            extension: extension
        }
        this.offset = offset;
        this.layers = layers;
        this.frameCount = frameCount;
        this.fps = fps;
        this.scale = scale;
        this.alpha = alpha;
        this.hidden = false;
        this.behindFade = behindFade
        this.frameIndex = frameIndex;
        if (frameCount <= 1) {
            // use imagePath as path to image (without extension, auto-adds path to graphics folder)
            let src = "../graphics/" + imagePath + extension;
            let img;
            if (src in Graphic.imgDict) {
                img = Graphic.imgDict[src];
            } else {
                img = new Image();
                img.src = src;
                Graphic.imgDict[src] = img;
            }
            this.frames.push(img)
        } else {
            // use imagePath as base path with imagePath + number + extension representing the actual image path (number starts at 0, auto-adds path to graphics folder)
            for (let i = 0; i < frameCount; i++) {
                let src = "../graphics/" + imagePath + ((frameCount > 1) ? "/" : "") + (i).toString() + extension;
                let img;
                if (src in Graphic.imgDict) {
                    img = Graphic.imgDict[src];
                } else {
                    img = new Image();
                    img.src = src;
                    Graphic.imgDict[src] = img;
                }
                this.frames.push(img)
            }
        }
    }

    getImage() { // gets correct frame image
        let frame;
        if (this.frameIndex == null) {
            frame = Math.floor(MainLoop.cycles / MainLoop.fps * this.fps) % this.frames.length;
        } else {
            frame = this.frameIndex;
        }
        return this.frames[frame];
    }

    getDim() { // gets image dimensions
        return [this.frames[0].width, this.frames[0].height]
    }

    clone() { // returns a deepcopy of the object
        return new Graphic(this.initData.imagePath, ce.cloneObj(this.layers), this.initData.extension, this.scale, this.frameCount, this.fps, ce.cloneObj(this.offset), this.alpha, this.frameIndex, this.behindFade);
    }

    // draws graphic
    draw(pPos, alphaMulti=1, ignoredLayers=[]) {
        let alpha = this.alpha * alphaMulti;
        if (this.hidden || alpha <= 0) return;
        for (let l = 0; l < this.layers.length; l++) {
            if (ignoredLayers.includes(this.layers[l])) continue;
            let lCtx = Draw.layerCanvases[this.layers[l]].getContext('2d');
            lCtx.save();
            let img = this.getImage();
            let pos = [pPos[0] + this.offset[0], -pPos[1] - img.height * this.scale - this.offset[1]]
            let imgDim = [img.width, img.height]

            // detect if off screen
            /*
            for (let i = 0; i < 2; i++) {
                if (Math.abs(pPos[i] + this.offset[i] + imgDim[i] * this.scale / 2 - Player.camPos[i]) > (ce.screenDim[i]/zoom + imgDim[i] * this.scale) / 2) {
                    lCtx.restore();
                    return;
                }
            }
            */

            // draw image
            if (alpha != 1) lCtx.globalAlpha = alpha;
            lCtx.transformCanvas(this.scale, 0, pos[0], pos[1])
            try {
                lCtx.drawImage(img, 0, 0);
            } catch (e) {
                throw new Error("image broken: " + img.src);
            }
            lCtx.restore();
            if (alpha != 1) lCtx.globalAlpha = 1;
        }
    }
}