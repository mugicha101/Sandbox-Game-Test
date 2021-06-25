import * as ce from './canvasExtension.js';
import * as inp from './input.js';
import { inputs } from './input.js';
import { Graphic } from './graphics.js';
import { Collision, HitBox } from './collisions.js';
import { TileType } from './tileSystem.js';
import { Draw, MainLoop } from './main.js';
const canvas = ce.canvas
const c = canvas.getContext("2d", { alpha: false })

export { PlayerInv, ItemType, TileItemType };

class InvType {
    constructor(typeType, stackSize=99) {
        this.stackSize = stackSize;
        this.typeType = typeType;
    }

    equals(type) {
        if (type == null) return false;
        if (this.typeType != type.typeType) return false;
        switch(this.typeType) {
            case "item":
                return (this.name == type.name);
            case "tile":
                return (this.tileType == type.tileType);
            default:
                return false;
        }
    }
}

class ItemType extends InvType { // represents nontile types in the inventory
    constructor(name, graphic, stackSize=99) {
        super("item", stackSize);
        this.name = name;
        this.graphic = graphic;
    }
}

class TileItemType extends InvType { // represents tile types in the inventory
    constructor(tileType=TileType.types.grass, stackSize=99) {
        super("tile", stackSize);
        this.tileType = tileType;
    }

    draw(pos) {
        this.tileType.itemGraphic.draw([ce.screenDim[0]/2+pos[0], -ce.screenDim[1]/2+pos[1]]);
    }
}

const inScale = 0.25;
const itemNumGraphic = new Graphic("../graphics/item_numbers", ["inventory"], ".png", inScale, 10, null, [-24*inScale, -32*inScale], 1, 0)
class Item { // represents items in the inventory
    constructor(type, amount=null, pos=[0,0]) {
        if (amount == null)
            amount = type.stackSize;
        this.type = type;
        this.amount = amount;
        this.pos = pos;
    }

    draw() {
        this.type.draw(this.pos);
        let numStr = this.amount.toString();
        for (let i = 0; i < numStr.length; i++) {
            let num = parseInt(numStr[i]);
            itemNumGraphic.frameIndex = num;
            let pos = [this.pos[0]+(-(numStr.length-1)/2+i)*52*inScale, this.pos[1]];
            itemNumGraphic.draw([ce.screenDim[0]/2+pos[0], -ce.screenDim[1]/2+pos[1]])
        }
    }

    clone() {
        return new Item(this.type, this.amount, [this.pos[0], this.pos[1]]);
    }
}

const slotScale = 0.3;
class Slot { // holds items in the inventory
    static size = 320*slotScale;
    static slotArr = [];
    static graphics = {
        empty: new Graphic("../graphics/inv_tiles/empty", ["inventory"], ".png", slotScale, undefined, undefined, [-Slot.size/2, -Slot.size/2]),
        head: new Graphic("../graphics/inv_tiles/head", ["inventory"], ".png", slotScale, undefined, undefined, [-Slot.size/2, -Slot.size/2]),
        body: new Graphic("../graphics/inv_tiles/body", ["inventory"], ".png", slotScale, undefined, undefined, [-Slot.size/2, -Slot.size/2]),
        legs: new Graphic("../graphics/inv_tiles/legs", ["inventory"], ".png", slotScale, undefined, undefined, [-Slot.size/2, -Slot.size/2]),
        feet: new Graphic("../graphics/inv_tiles/feet", ["inventory"], ".png", slotScale, undefined, undefined, [-Slot.size/2, -Slot.size/2]),
        hb1: new Graphic("../graphics/inv_tiles/hb1", ["inventory"], ".png", slotScale, undefined, undefined, [-Slot.size/2, -Slot.size/2]),
        hb2: new Graphic("../graphics/inv_tiles/hb2", ["inventory"], ".png", slotScale, undefined, undefined, [-Slot.size/2, -Slot.size/2]),
        hb3: new Graphic("../graphics/inv_tiles/hb3", ["inventory"], ".png", slotScale, undefined, undefined, [-Slot.size/2, -Slot.size/2]),
        hb4: new Graphic("../graphics/inv_tiles/hb4", ["inventory"], ".png", slotScale, undefined, undefined, [-Slot.size/2, -Slot.size/2]),
        hb5: new Graphic("../graphics/inv_tiles/hb5", ["inventory"], ".png", slotScale, undefined, undefined, [-Slot.size/2, -Slot.size/2]),
        hb6: new Graphic("../graphics/inv_tiles/hb6", ["inventory"], ".png", slotScale, undefined, undefined, [-Slot.size/2, -Slot.size/2]),
        hb7: new Graphic("../graphics/inv_tiles/hb7", ["inventory"], ".png", slotScale, undefined, undefined, [-Slot.size/2, -Slot.size/2]),
        hb8: new Graphic("../graphics/inv_tiles/hb8", ["inventory"], ".png", slotScale, undefined, undefined, [-Slot.size/2, -Slot.size/2]),
        hb9: new Graphic("../graphics/inv_tiles/hb9", ["inventory"], ".png", slotScale, undefined, undefined, [-Slot.size/2, -Slot.size/2]),
        hb10: new Graphic("../graphics/inv_tiles/hb10", ["inventory"], ".png", slotScale, undefined, undefined, [-Slot.size/2, -Slot.size/2]),
        hbSelected: new Graphic("../graphics/inv_tiles/hb_selected", ["inventory"], ".png", slotScale, undefined, undefined, [-(Slot.size+32*slotScale)/2, -(Slot.size+32*slotScale)/2]),
    }

    constructor(pos, emptyGraphic=Slot.graphics.empty, filledGraphic=Slot.graphics.empty, item=null) {
        this.pos = pos;
        this.emptyGraphic = emptyGraphic;
        this.filledGraphic = filledGraphic;
        this.item = item;
        this.hb = new HitBox([this.pos[0]-Slot.size/2, this.pos[1]-Slot.size/2], [Slot.size, Slot.size]);
        this.index = Slot.slotArr.length;
        Slot.slotArr.push(this);
    }

    draw() {
        this.emptyGraphic.draw([ce.screenDim[0]/2+this.pos[0], -ce.screenDim[1]/2+this.pos[1]]);
    }

    removeOneItem() {
        this.item.amount--;
        if (this.item.amount <= 0)
            this.item = null;
    }

    mergeItem(item, maxChange=null) { // merges item with current slot item and returns item (contains remaining items that can't be merged)
        if (item == null) return item;
        if (this.item == null) {
            this.item = item.clone();
            this.item.amount = 0;
        }
        if (!this.item.type.equals(item.type)) return item;
        let change = item.amount;
        if (this.item.amount + change > this.item.type.stackSize) {
            change -= this.item.amount + change - this.item.type.stackSize;
        }
        if (maxChange != null && change > maxChange)
            change = maxChange;
        this.item.amount += change;
        item.amount -= change;
        if (item.amount == 0) return null;
        else return item;
    }
}

const PlayerInv = {}
PlayerInv.open = false;
PlayerInv.hbIndex = 0; // selected hotbar index
PlayerInv.mainDim = [10, 5];
PlayerInv.main = [];
for (let i = 0; i < PlayerInv.mainDim[1]; i++) {
    let row = [];
    for (let j = 0; j < PlayerInv.mainDim[0]; j++) {
        row.push(new Slot([
            (j-(PlayerInv.mainDim[0]-1)/2)*Slot.size,
            (i-(PlayerInv.mainDim[1]-1)/2)*Slot.size
        ]));
    }
    PlayerInv.main.push(row);
}

let armorX = -((PlayerInv.mainDim[0]-1)/2+2)*Slot.size;
PlayerInv.armor = {
    head: new Slot([armorX, 1.5*Slot.size], Slot.graphics.head),
    body: new Slot([armorX, 0.5*Slot.size], Slot.graphics.body),
    legs: new Slot([armorX, -0.5*Slot.size], Slot.graphics.legs),
    feet: new Slot([armorX, -1.5*Slot.size], Slot.graphics.feet),
}

PlayerInv.hotbar = [];
let hotbarY = -ce.screenDim[1]/2+Slot.size;
for (let i = 0; i < PlayerInv.mainDim[0]; i++) {
    PlayerInv.hotbar.push(new Slot([
        (i-(PlayerInv.mainDim[0]-1)/2)*Slot.size,
        hotbarY
    ], Slot.graphics[`hb${i+1}`]));
}

PlayerInv.heldItem = null;
let lastCycleMouseDown = false;
PlayerInv.inputCalc = function() {
    // helper functions
    let mouseHoverSlotIndex = function() {
        let index = null;
        for (let i = 0; i < Slot.slotArr.length; i++) {
            if (Slot.slotArr[i].hb.inBounds(ce.flipY(inp.mouseCoords))) {
                index = i;
                break;
            }
        }
        return index;
    }
    let swapSlots = function(slotIndex1, slotIndex2) {
        if (slotIndex1 == null || slotIndex2 == null || slotIndex1 == slotIndex2) return;
        let slot1 = Slot.slotArr[slotIndex1];
        let slot2 = Slot.slotArr[slotIndex2];
        let temp = slot1.item;
        slot1.item = slot2.item;
        slot2.item = temp;
    }

    // figure out mouse input
    let initialPress = false;
    let initialRelease = false;
    if (lastCycleMouseDown != inp.mouseDown) {
        lastCycleMouseDown = inp.mouseDown;
        if (inp.mouseDown) initialPress = true;
        else initialRelease = true;
    }

    // handle selected slot
    if (PlayerInv.open) {
        if (initialPress) {
            if (PlayerInv.heldItem == null) {
                // pick up
                let heldIndex = mouseHoverSlotIndex();
                if (heldIndex != null) {
                    if (inputs.rightClick.initialPress && Slot.slotArr[heldIndex].item != null) {
                        // pick up half stack
                        PlayerInv.heldItem = Slot.slotArr[heldIndex].item.clone();
                        let change = Math.floor(PlayerInv.heldItem.amount/2);
                        PlayerInv.heldItem.amount -= change;
                        Slot.slotArr[heldIndex].item.amount = change;
                        if (Slot.slotArr[heldIndex].item.amount == 0)
                            Slot.slotArr[heldIndex].item = null;
                    } else {
                        // pick up full stack
                        PlayerInv.heldItem = Slot.slotArr[heldIndex].item;
                        Slot.slotArr[heldIndex].item = null;
                    }
                }
            } else {
                // drop
                let dropIndex = mouseHoverSlotIndex()
                let dropSlot = Slot.slotArr[dropIndex];
                if (dropSlot != null) {
                    if (inputs.rightClick.initialPress) {
                        // merge items
                        PlayerInv.heldItem = dropSlot.mergeItem(PlayerInv.heldItem, 1);
                    } else {
                        // swap held and drop items (becuz janky merge lol)
                        let temp = PlayerInv.heldItem;
                        PlayerInv.heldItem = dropSlot.item;
                        dropSlot.item = temp;

                        // merge items
                        PlayerInv.heldItem = dropSlot.mergeItem(PlayerInv.heldItem);
                    }
                }
            }
        }
    } else {
        if (PlayerInv.heldItem != null) {
            PlayerInv.heldItem = null;
        }
    }

    // hotbar hotkeys
    for (let i = 1; i <= PlayerInv.mainDim[0]; i++) {
        if (inputs[`slot${i}`].initialPress) {
            if (PlayerInv.open) {
                swapSlots(PlayerInv.hotbar[i-1].index, mouseHoverSlotIndex());
            } else {
                PlayerInv.hbIndex = i-1;
                PlayerInv.lastWheelCycle = MainLoop.cycles;
            }
        }
    }
}

PlayerInv.getActiveSlot = function() {
    return PlayerInv.hotbar[PlayerInv.hbIndex];
}

PlayerInv.calc = function() {
    // move items
    for (let i = 0; i < Slot.slotArr.length; i++) {
        let slot = Slot.slotArr[i];
        if (slot.item == null) continue;
        for (let j = 0; j < 2; j++) {
            slot.item.pos[j] += (slot.pos[j]-slot.item.pos[j])*0.25;
        }
    }
    if (PlayerInv.heldItem != null) {
        for (let j = 0; j < 2; j++) {
            PlayerInv.heldItem.pos[j] += (ce.flipY(inp.mouseCoords)[j]-PlayerInv.heldItem.pos[j])*0.25;
        }
    }
    
    if (PlayerInv.open)
        PlayerInv.lastWheelCycle = MainLoop.cycles;
}

PlayerInv.draw = function() {
    // draw slots
    let slotArr;
    if (PlayerInv.open)
        slotArr = Slot.slotArr;
    else
        slotArr = PlayerInv.hotbar;
    for (let i = 0; i < slotArr.length; i++) {
        slotArr[i].draw();
    }

    // draw items
    for (let i = 0; i < slotArr.length; i++) {
        let item = slotArr[i].item;
        if (item == null) continue;
        item.draw();
    }

    // draw selected slot indicator
    Slot.graphics.hbSelected.draw([ce.screenDim[0]/2+PlayerInv.hotbar[PlayerInv.hbIndex].pos[0], -ce.screenDim[1]/2+hotbarY])

    // draw held item
    if (PlayerInv.heldItem != null)
        PlayerInv.heldItem.draw();
}

PlayerInv.lastWheelCycle = 0;
canvas.addEventListener('wheel', function(event)
{
    PlayerInv.hbIndex = (PlayerInv.hbIndex + Math.sign(event.deltaY) + PlayerInv.mainDim[0]) % PlayerInv.mainDim[0];
    PlayerInv.lastWheelCycle = MainLoop.cycles;
});

PlayerInv.init = function() {
    PlayerInv.hotbar[0].item = new Item(new TileItemType());
    PlayerInv.hotbar[1].item = new Item(new TileItemType(TileType.types.stone_brick));
    PlayerInv.hotbar[2].item = new Item(new TileItemType(TileType.types.dirt), 50);
    PlayerInv.hotbar[3].item = new Item(new TileItemType(TileType.types.dirt), 80);
}