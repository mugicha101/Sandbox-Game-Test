import {MainLoop} from "./main.js";
import * as ce from './canvasExtension.js';
// import {Player} from './player.js';
const Player = { // placeholder Player object for SpatialSound
    pos: [0,0]
}

// for legacy browsers
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

export class Sound {
    #volume = 1;
    constructor(src, amount=10, volume=1) {
        this.src = src;
        let sound = document.createElement("audio");
        sound.src = src;
        sound.setAttribute("preload", "auto");
        sound.setAttribute("controls", "none");
        sound.style.display = "none";
        document.body.appendChild(sound);
        this.sound = sound
        this.#volume = volume
        this.loadedMetadata = false
        this.duration = null
        this.soundArr = []
        this.amount = amount
        this.loadedCount = 0;
        for (let i = 0; i < this.amount; i++) {
            let soundClone = sound.cloneNode(true);
            soundClone.soundRef = this;
            this.soundArr.push(soundClone)
            soundClone.load();
            soundClone.onloadedmetadata = function() {
                this.soundRef.duration = this.duration
                this.volume = 0
                this.play();
                let originObj = this;
                // console.log(this.src)

                // play the sound for a brief moment then stop to remove delay
                let delayedPause = setInterval(function() {
                    originObj.pause();
                    originObj.currentTime = 0;
                    originObj.soundRef.loadedCount++;
                    if (originObj.soundRef.loadedCount === originObj.soundRef.soundArr.length) {
                        originObj.soundRef.loadedMetadata = true;
                    }
                    originObj.volume = originObj.soundRef.volume
                    clearInterval(delayedPause);
                }, 100)
            };
        }
        this.index = 0
    }
    play(volumeMulti=null) {
        let volume = this.volume;
        if (volumeMulti != null) {
            volume *= volumeMulti;
        }
        let s = this.soundArr[this.index];
        if (audioCtx.state === 'suspended') {
            console.log("RESUME");
            audioCtx.resume();
        }
        s.volume = volume;
        s.play();
        this.index ++
        if (this.index >= this.amount) {
            this.index = 0
        }
    }
    stop() {
        for (let i = 0; i < this.soundArr.length; i++) {
            this.soundArr[i].pause();
            this.soundArr[i].currentTime = 0;
        }
    }
    get volume() {
        return this.#volume;
    }
    set volume(volume) {
        for (let i = 0; i < this.soundArr.length; i++) {
            this.soundArr[i].volume = volume;
        }
        this.#volume = volume;
    }
    static sounds = null;
    static initSounds() {
        Sound.sounds = {
            /*
            hit: new SpatialSound("../audio/hit.wav", 10, 0.3),
            projHit: new SpatialSound("../audio/orb/enemy_hit.mp3", 2, 0.5),
            rumble: new Sound("../audio/rumble.mp3", 1, 1),
            boom: new Sound("../audio/boom.wav", 1, 0.5),
            buttonDown: new SpatialSound("../audio/button/button_down.mp3", 3, 1),
            buttonUp: new SpatialSound("../audio/button/button_up.mp3", 3, 1),
            shootOrb: new Sound("../audio/orb/shoot.mp3", 3, 1),
            wallHit: new SpatialSound("../audio/orb/wall_hit.mp3", 10, 0.75),
            orbMagic: new SpatialSound("../audio/orb/magic.mp3", 3, 0.5),
            retrieveOrb: new SpatialSound("../audio/orb/retrieve.mp3", 10, 0.5),
            paper: new Sound("../audio/paper.mp3", 1, 1),
            orbAbsorb: new SpatialSound("../audio/orb/absorb.mp3", 10, 0.2),
            tap1: new Sound("../audio/dialog/tap1.mp3", 10, 0.2),
            tap2: new Sound("../audio/dialog/tap2.mp3", 10, 0.2),
            tap3: new Sound("../audio/dialog/tap3.mp3", 10, 0.2),
            eardeth: new SpatialSound("../audio/eardeth.wav", 25, 0.5),
            earhurt: new SpatialSound("../audio/eardeth.wav", 25, 0.5, 0.25),
            coreCannonBlast: new SpatialSound("../audio/core_cannon_blast.mp3", 5, 1),
            eShotTap: new SpatialSound("../audio/shot/tap.mp3", 40, 0.2),
            eShotBump: new SpatialSound("../audio/shot/bump.mp3", 20, 0.2),
            eShotSlam: new SpatialSound("../audio/shot/slam.mp3", 10, 0.2),
            eShotBlast: new SpatialSound("../audio/shot/blast.wav", 5, 1),
            */
        }
    }
}

// SpatialSound needs Player object to work properly (suggestion: import from another file)
export class SpatialSound extends Sound { // allows for the sound to be played at a position
    static objArr = [];
    constructor(src, amount=10, volume=1, rangeMulti=1) {
        super(src, amount, volume);
        SpatialSound.objArr.push(this);
        this.rangeMulti = rangeMulti;
        for (let i = 0; i < this.soundArr.length; i++) {
            let s = this.soundArr[i];
            s.pos = [0,0];
            s.soundDir = 0;
            s.volumeMulti = 1;

            let track = audioCtx.createMediaElementSource(s);
            s.track = track;

            let stereoNode = new StereoPannerNode(audioCtx, {pan: 0});
            s.stereoNode = stereoNode;
            
            // stereoNode.pan.value = -1; // FOR TESTING

            track.connect(stereoNode).connect(audioCtx.destination);

            s.distMulti = 0;
            s.updateSoundPos = function() { // changes pan and distVolume of sound based on its pos
                if (!s.directional) { // point source sound
                    // if usePosObj, updates position
                    if (s.usePosObj) {
                        let newPos = s.posObj[s.objPosKey];
                        if (newPos != null) s.pos = newPos;
                        else {
                            s.pause();
                            s.currentTime = 0;
                        }
                    }
                    
                    // calculate distance
                    let distSqd = ce.distance(s.pos, Player.pos, false);

                    // calculate pan
                    if (distSqd === 0)
                        s.stereoNode.pan.value = 0;
                    else
                        s.stereoNode.pan.value = (s.pos[0]-Player.pos[0])/Math.sqrt(distSqd);
                    
                    // calculate distMulti
                    s.distMulti = 1/(1 + distSqd / 500000 / s.soundRef.rangeMulti)
                    s.volume = s.volumeMulti * s.distMulti;
                } else { // directional sound
                    // calculate pan
                    s.stereoNode.pan.value = Math.cos(s.soundDir);
                    s.distMulti = 1;
                }
            }
        }
    }

    static updateSoundPos() { // updates all sound objects in soundArr to match their position
        for (let i = 0; i < SpatialSound.objArr.length; i++) {
            for (let j = 0; j < SpatialSound.objArr[i].soundArr.length; j++) {
                let s = SpatialSound.objArr[i].soundArr[j];
                if (s.playing)
                    s.updateSoundPos();
            }
        }
    }
    /*
    if usePosObj is true, uses an object with a position instead of directly referencing the position
    objPosKey is the key in the pos obj that holds the position
    */
    play(pos, volumeMulti=null, usePosObj=false, objPosKey="pos") { // pos is byref to support moving sounds
        if (volumeMulti == null) volumeMulti = 1;
        let s = this.soundArr[this.index];
        s.usePosObj = usePosObj;
        s.volumeMulti = volumeMulti;
        if (usePosObj) {
            s.posObj = pos;
            s.objPosKey = objPosKey;
        } else {
            s.pos = pos;
        }
        s.directional = false;
        s.updateSoundPos();
        super.play(volumeMulti * s.distMulti);
        s.playing = true;
        var timer = setTimeout(function() {
            s.playing = false;
        }, s.duration * 1000);
    }

    playDir(dir, volumeMulti=null, deg=true) { // plays from a certain direction
        if (volumeMulti == null) volumeMulti = 1;
        let s = this.soundArr[this.index];
        s.soundDir = dir * ((deg)? Math.PI/180 : 1); // store dir in radians
        s.directional = true;
        s.updateSoundPos();
        super.play(volumeMulti * s.distMulti);
    }
}

const musicRefArr = [];
function getMusic(srcId, volume=0.08) {
    let music = document.getElementById(srcId);
    music.baseVolume = volume;
    music.volume = volume;    
    music.stop = function() {
        this.pause();
        this.currentTime = 0;
    }
    musicRefArr.push(music);
    return music;
}

// NOTE: MUSIC CAN'T BE MP3 (doesn't load properly), M4A WORKS
export const Music = {
    changeMusic: function(id=null) {
        if (MainLoop.music != null)
            MainLoop.music.stop();
        if (id == null)
            MainLoop.music = null;
        else
            MainLoop.music = Music[id];
    },

    changeVolume: function(volume) {
        for (let i in musicRefArr) {
            musicRefArr[i].volume = musicRefArr[i].baseVolume * volume;
        }
    },

    title: getMusic("title_music"),
    s1a: getMusic("s1a_music"),
    s1b: getMusic("s1b_music"),
    s2a: getMusic("s2a_music"),
    s2b: getMusic("s2b_music"),
    s3a: getMusic("s3a_music"),
    s3b: getMusic("s3b_music"),

}