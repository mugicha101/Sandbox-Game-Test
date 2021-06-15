import { Map, TileType, Tile } from './tileSystem.js';
export { WorldGen };

const WorldGen = {};

WorldGen.genSequence = function() {
    Map.create();
    WorldGen.addBaseTerrain();
    WorldGen.addCaves();
    WorldGen.addOres();
    WorldGen.addGrass();
    WorldGen.addTrees();
}

WorldGen.addBaseTerrain = function() {
    Map.loopThroughTiles(function(tile) {
        let type;
        let grassHeight = Map.noise.noise2D(tile.pos[0]/Tile.size/100, 0)*10+100
        let dirtHeight = Map.noise.noise2D(tile.pos[0]/Tile.size/50, 10000)*2+4
        if (tile.pos[1]/Tile.size > Math.ceil(grassHeight))
            type = null;
        else if (tile.pos[1]/Tile.size > grassHeight - dirtHeight)
            type = TileType.types.dirt;
        else
            type = TileType.types.stone;
        tile.replace(new Tile(type, tile.pos));
    });
}

WorldGen.addCaves = function() {

}

WorldGen.addOres = function() {

}

WorldGen.addTrees = function() {
    for (let i = 0; i < Math.floor(Map.dim[0]/Tile.size/10); i++) {
        let x = Math.floor(Math.random()*Map.dim[0]/Tile.size);
        let y = Map.dim[1]/Tile.size-1;
        while (Map.getTileAt([x,y]).type == null && y >= 0) {
            y--;
        }
        if (y >= 0 && Map.getTileAt([x,y]).type.name == "grass") {
            y++;

            // add logs
            for (let h = 0; h < Math.floor(Math.random()*3)+3; h++) {
                Map.setTileAt([x,y++], new Tile(TileType.types.log));
            }

            // add leaves
            let oArr = [];
            for (let i = -2; i <= 2; i++) {
                oArr.push([i,0]);
                oArr.push([i,1]);
            }
            for (let i = -1; i <= 1; i++)
                oArr.push([i,2]);
            for (let i = 0; i < oArr.length; i++)
                Map.setTileAt([x+oArr[i][0],y+oArr[i][1]], new Tile(TileType.types.leaves));
        }
    }
}

WorldGen.addGrass = function() {
    Map.loopThroughTiles(function(tile) {
        if (tile.type == null || tile.type.name != "dirt")
            return;
        let aboveTile = Map.getTileAt([tile.pos[0], tile.pos[1]+Tile.size], false);
        if (aboveTile != null && aboveTile.type == null)
            tile.replace(new Tile(TileType.types.grass, tile.pos));
    });
}