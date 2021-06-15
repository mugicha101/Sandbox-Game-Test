export const canvas = document.getElementById("canvas")
canvas.style.cursor = 'none';
export const c = canvas.getContext("2d", {alpha:false})

extendCanvas(canvas,c);

/*
let chunkDataReq = new XMLHttpRequest();
chunkDataReq.open('GET', 'mapData/chunkData.txt');
chunkDataReq.onload = function() {

}
*/

// The screenDim determines the size of the canvas. The canvas will automatically scale with the screen size (using c.resizeCanvas()) 
let screenHeight = 1050
export const screenDim = [screenHeight*4/3,screenHeight]
const screenTopGap = 0
const screenSideGap = 0

export function flipY(coords) {
    return [coords[0], -coords[1]]
}

export function cloneObj(a) {
    return JSON.parse(JSON.stringify(a))
}

export function move(initialCoords, dir, amount) {
    let radians = dir*Math.PI/180
    let xChange = Math.cos(radians) * amount
    let yChange = Math.sin(radians) * amount
    return [initialCoords[0] + xChange, initialCoords[1] + yChange]
}

export function dirToTarget(initialCoords, targetCoords, deg=true) {
    return Math.atan2(targetCoords[1]-initialCoords[1], targetCoords[0]-initialCoords[0])* ((deg)? 180/Math.PI : 1);
}

export function distance(initialCoords, targetCoords, sqrt=true) {
    if (sqrt) {
        return Math.sqrt(Math.pow(initialCoords[0]-targetCoords[0],2)+Math.pow(initialCoords[1]-targetCoords[1],2))
    } else {
        return Math.pow(initialCoords[0]-targetCoords[0],2)+Math.pow(initialCoords[1]-targetCoords[1],2)
    }
}

export function rotateAroundPivot(initialCoords, amount, pivotCoords=[0,0]) {
    // transform so pivot coords become [0,0]
    initialCoords = [initialCoords[0]-pivotCoords[0], initialCoords[1]-pivotCoords[1]];
    // rotate coords using imaginary number multiplication: (cos(deg)+sin(deg)i)*(x+yi)
    let s = Math.sin(amount*Math.PI/180);
    let c = Math.cos(amount*Math.PI/180);
    let finalCoords = [x*c-y*s,x*s+y*c]
    // transform so pivot coords move back to original position
    for (let i = 0; i < 2; i++)
        finalCoords[i] += pivotCoords[i];
    return finalCoords;
}

export function colorLighten(colorArr, proportion) {
    colorArr = cloneObj(colorArr)
    for (let i = 0; i < 3; i++) {
        colorArr[i] += (255 - colorArr[i]) * proportion
    }
    return colorArr;
}

export function colorDarken(colorArr, proportion) {
    colorArr = cloneObj(colorArr)
    for (let i = 0; i < 3; i++) {
        colorArr[i] -= colorArr[i]*proportion;
    }
    return colorArr
}

export function colorArrToString(colorArr) {
    return `rgb(${colorArr[0]},${colorArr[1]},${colorArr[2]})`;
}

export function extendCanvas(canvas, ctx) {
    ctx.prevScale = null
    ctx.canvasScale = 1;
    ctx.resizeCanvas = function() {
        let windowDim = ctx.getWindowDim();
        let scaleW = windowDim[0] / screenDim[0];
        let scaleH = windowDim[1] / screenDim[1];
        ctx.canvasScale = (scaleW < scaleH)? scaleW : scaleH;
        if (ctx.prevScale === ctx.canvasScale) return;
        ctx.prevScale = ctx.canvasScale;
        canvas.width = screenDim[0] * ctx.canvasScale;
        canvas.height = screenDim[1] * ctx.canvasScale;
    }

    ctx.getWindowDim = function() {
        let height = window.innerHeight - screenTopGap
        let width = window.innerWidth - screenSideGap
        let dim = [width, height]
        return dim
    }

    ctx.transformCanvas = function(scale, rot, hMove, vMove) {
        transformCanvas(ctx, scale, rot, hMove, vMove)
    }

    ctx.resetTrans = function(autoScaled=true,resetAlpha=true) {
        resetTrans(ctx, autoScaled, resetAlpha)
    }

    ctx.circle = function(x, y, radius) {
        circle(ctx, x, y, radius)
    }

    ctx.fillCircle = function(x, y, radius) {
        fillCircle(ctx, x, y, radius)
    }

    ctx.fillEllipse = function(x, y, dir, minRadius, maxRadius) {
        fillEllipse(ctx, x, y, dir, minRadius, maxRadius)
    }

    ctx.star = function(x, y, radius, dir=0, points=5, innerScale=0.5) {
        star(ctx, x, y, radius, dir, points, innerScale)
    }

    ctx.fillStar = function(x, y, radius, dir=0, points=5, innerScale=0.5) {
        fillStar(ctx, x, y, radius, dir, points, innerScale)
    }

    ctx.poly = function(x, y, radius, sides, dir=0) {
        poly(ctx, x, y, radius, sides, dir)
    }

    ctx.fillPoly = function(x, y, radius, sides, dir=0) {
        fillPoly(ctx, x, y, radius, sides, dir)
    }
}

export function transformCanvas(ctx, scale, rot, hMove, vMove) {
    ctx.transform(scale, 0, 0, scale, hMove, vMove)
    if (rot != 0) {
        ctx.rotate(rot*Math.PI/180)
    }
}

export function circle(ctx, x, y, radius) {
    ctx.arc(x, y, radius, 0, 2 * Math.PI)
}

export function fillCircle(ctx, x, y, radius) {
    ctx.beginPath()
    circle(ctx, x, y, radius)
    ctx.fill()
}

export function fillEllipse(ctx, x, y, dir, minRadius, maxRadius) {
    if (ctx == null) {
        ctx = c;
    }
    ctx.beginPath()
    ctx.ellipse(x, y, maxRadius, minRadius, dir*Math.PI/180, 0, 2*Math.PI)
    ctx.fill()
}

export function poly(ctx, x, y, radius, sides, dir=0) {
    if (ctx == null) {
        ctx = c;
    }
    let pointArr = [];
    for (let i = 0; i <= sides; i++) {
        pointArr.push(move([x,y], i*(360/sides)+dir, radius));
    }
    for (let i in pointArr) {
        if (i === 0) {
            ctx.moveTo(pointArr[i][0], pointArr[i][1]);
        } else {
            ctx.lineTo(pointArr[i][0], pointArr[i][1]);
        }
    }
    ctx.closePath();
}

export function fillPoly(ctx, x, y, radius, sides, dir=0) {
    ctx.beginPath();
    poly(ctx, x, y, radius, sides, dir);
    ctx.fill();
}

export function star(ctx, x, y, radius, dir=0, points=5, innerScale=0.5) {
    if (ctx == null) {
        ctx = c;
    }
    let activeDir = (dir)*Math.PI/180
    ctx.moveTo(Math.cos(activeDir)*radius, Math.sin(activeDir)*radius)
    for (let pointCount = 0; pointCount < points; pointCount++) {
        activeDir += 360/(points*2)*Math.PI/180
        ctx.lineTo(Math.cos(activeDir)*radius*innerScale, Math.sin(activeDir)*radius*innerScale)
        activeDir += 360/(points*2)*Math.PI/180
        ctx.lineTo(Math.cos(activeDir)*radius, Math.sin(activeDir)*radius)
    }
}

export function fillStar(ctx, x, y, radius, dir=0, points=5, innerScale=0.5){
    ctx.beginPath()
    star(ctx, x, y, radius, dir, points, innerScale)  ;
    ctx.fill();
}

export function resetTrans(ctx, autoScaled = true, resetAlpha = true) {
    if (autoScaled) {
        ctx.setTransform(ctx.canvasScale, 0, 0, ctx.canvasScale, 0, 0)
    } else {
        ctx.setTransform(1, 0, 0, 1, 0, 0)
    }
    if (resetAlpha) {
        ctx.globalAlpha = 1;
    }
}

export function createCanvas(width = 1000, height = 1000, extend = true) {
    let newCanvas = document.createElement('canvas');
    newCanvas.width = width;
    newCanvas.height = height;
    if (extend) extendCanvas(newCanvas, newCanvas.getContext('2d'))
    return newCanvas;
}

export function getColor(value,returnArr=false) {
    if (returnArr) return [
        127.5+Math.cos(-value*2*Math.PI)*127.5,
        127.5+Math.cos((-value*2+2/3)*Math.PI)*127.5,
        127.5+Math.cos((-value*2+4/3)*Math.PI)*127.5
    ];
    else return {
        r: 127.5+Math.cos(-value*2*Math.PI)*127.5,
        g: 127.5+Math.cos((-value*2+2/3)*Math.PI)*127.5,
        b: 127.5+Math.cos((-value*2+4/3)*Math.PI)*127.5
    };
}