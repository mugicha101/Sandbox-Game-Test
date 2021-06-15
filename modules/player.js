export {Player}
import {Collision, HitBox, HitCircle} from './collisions.js';
import * as inp from './input.js';
import { inputs } from './input.js';
import { Draw, debug } from './main.js';
import * as ce from './canvasExtension.js';
const canvas = ce.canvas
const c = canvas.getContext("2d", { alpha: false })
import { Tile, Map } from './tileSystem.js';

const Player = {}
Player.init = function() {
    Player.speed = 3;
    Player.pos = [0,0];
    Player.velo = [0,0];
    Player.camPos = [0,0];
    Player.onGround = false;
    Player.hb = new HitBox([0,0], [Tile.size*0.9, Tile.size*1.8], true, false);
}
Player.updateHitbox = function() {
    for (let i = 0; i < 2; i++) {
        Player.hb.pos[i] = Player.pos[i]-Player.hb.dim[0]/2;
    }
}
Player.goToSpawn = function() {
    let camOffset = [Player.pos[0] - Player.camPos[0], Player.pos[1] - Player.camPos[1]];
    Player.pos = [Map.dim[0]/2, Tile.size*150];
    Player.camPos = [Player.pos[0] - camOffset[0], Player.pos[1] - camOffset[1]]
    Player.updateHitbox();
}
Player.move = function() {
    let playerCollision = function(axis) {
        if (debug) {
            Player.updateHitbox();
            return;
        };

        // get tiles
        let tiles = Map.getTilesInBounds(Player.hb, true);
        for (let i = 0; i < tiles.length; i++) {
            let colData = Collision.isTouching(Player.hb, tiles[i].hb);
            if (colData.overlap) {
                if (axis == 0) {
                    Player.pos[0] -= colData.hOverlapAmount;
                    Player.velo[0] = 0;
                } else {
                    Player.pos[1] -= colData.vOverlapAmount;
                    Player.velo[1] = 0;
                    if (colData.vOverlapAmount < 0)
                        Player.onGround = true;
                }
                Player.updateHitbox();
            }
        }
        if (axis == 1 && tiles.length == 0)
            Player.onGround = false;

        Player.updateHitbox();
    }

    // side movement
    if (inputs.left.pressed) Player.velo[0] -= Player.speed;
    if (inputs.right.pressed) Player.velo[0] += Player.speed;

    // jump movement
    if (Player.onGround && inputs.up.pressed) {
        Player.onGround = false;
        Player.velo[1] = 25;
    }

    // apply movement
    for (let i = 0; i < 2; i++) {
        Player.pos[i] += Player.velo[i];
        Player.updateHitbox();
        playerCollision(i);
        Player.camPos[i] += (Player.pos[i]-Player.camPos[i])*0.2;
    }

    // gravity
    if (Player.velo[1] > 0) {
        if (inputs.up.pressed && !inputs.down.pressed)
            Player.velo[1] -= 1;
        else {
            Player.velo[1] -= 2;
            Player.velo[1] *= 0.75;
        }
    } else {
        if (inputs.down.pressed)
            Player.velo[1] -= 5;
        else
            Player.velo[1] -= 2;
    }

    // falling out of world
    if (Player.pos[1] < -Tile.size*50) {
        Player.goToSpawn();
    }

    // velo dampen
    Player.velo[0] *= 0.8;
    Player.velo[1] *= 0.99;
}
Player.draw = function() {
    Draw.camCanvasOffset();
    c.fillStyle = "rgb(255,0,0)";
    c.fillRect(Player.hb.pos[0], -Player.hb.pos[1], Player.hb.dim[0], -Player.hb.dim[1]);
}