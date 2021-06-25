import * as ce from './canvasExtension.js';
import {Player} from './player.js';
export {Collision, HitBox, HitCircle};

class Collision {
    type = ""; // either box or circle
    pos = [0, 0];
    id = '';

    constructor(pos) {
        this.pos = pos;
    }

    static isTouching(cA, cB) { // checks if collisions are intersecting each other
        if (cA.type === "box" && cB.type === "box") {
            // 2 boxes
            var hOverlap = true;
            var vOverlap = true;
            var hOverlapAmount = -1;
            var vOverlapAmount = -1;

            var aTopLeftCorner = cA.pos;
            var aBottomRightCorner = [cA.pos[0] + cA.dim[0], cA.pos[1] + cA.dim[1]];
            var aCenterPos = [cA.pos[0] + cA.dim[0] / 2, cA.pos[1] + cA.dim[1] / 2]

            var bTopLeftCorner = cB.pos;
            var bBottomRightCorner = [cB.pos[0] + cB.dim[0], cB.pos[1] + cB.dim[1]];
            var bCenterPos = [cB.pos[0] + cB.dim[0] / 2, cB.pos[1] + cB.dim[1] / 2]

            // check horizontal bounds
            if (aTopLeftCorner[0] >= bBottomRightCorner[0] || bTopLeftCorner[0] >= aBottomRightCorner[0]) {
                hOverlap = false;
            }

            // check vertical bounds
            if (aTopLeftCorner[1] >= bBottomRightCorner[1] || bTopLeftCorner[1] >= aBottomRightCorner[1]) {
                vOverlap = false;
            }
            var overlap = vOverlap && hOverlap;

            // find h overlap and v overlap
            if (overlap) {
                // hOverlapAmount
                if (aCenterPos[0] < bCenterPos[0]) {
                    // set hOverlapAmount to distance from right edge of A to left edge of B
                    hOverlapAmount = aBottomRightCorner[0] - bTopLeftCorner[0];
                } else {
                    // set hOverlapAmount to distance from left edge of A to right edge of B
                    hOverlapAmount = aTopLeftCorner[0] - bBottomRightCorner[0];
                }

                // vOverlapAmount
                if (aCenterPos[1] < bCenterPos[1]) {
                    // set vOverlapAmount to distance from bottom edge of A to top edge of B
                    vOverlapAmount = aBottomRightCorner[1] - bTopLeftCorner[1];
                } else {
                    // set vOverlapAmount to distance from top edge of A to bottom edge of B
                    vOverlapAmount = aTopLeftCorner[1] - bBottomRightCorner[1];
                }
            }

            var overlap = vOverlap && hOverlap;
            return {
                overlap: overlap,
                hOverlapAmount: hOverlapAmount,
                vOverlapAmount: vOverlapAmount
            }
        } else if (cA.type === "box" && cB.type === "circle" || cA.type === "circle" && cB.type === "box") {
            // 1 circle 1 box
            let box;
            let cir;
            if (cA.type === "box") {
                box = cA;
                cir = cA;
            } else {
                box = cB;
                cir = cA;
            }
            let rad = cir.radius;
            let left = box.pos[0];
            let right = box.pos[0] + box.dim[0];
            let bottom = box.pos[1];
            let top = box.pos[1] + box.dim[1];
            var overlapType;
            var hOverlap = false;
            var vOverlap = false;
            var hOverlapAmount = -1;
            var vOverlapAmount = -1;

            // quick check
            if (cir.pos[0] <= left - cir.rad || cir.pos[0] >= right + cir.rad || cir.pos[1] <= bottom - cir.rad || cir.pos[1] >= top + cir.rad)
                return { overlap: false }

            // vertical edges
            if (cir.pos[0] < right && cir.pos[0] > left) {
                let diff = cir.pos[1] - (top + bottom) * 0.5;
                if (Math.abs(diff) < box.dim[1] / 2 + rad) {
                    overlapType = "vertical";
                    vOverlap = true;
                    vOverlapAmount = -(box.dim[1] / 2 + rad - Math.abs(diff)) * Math.sign(diff);
                }
            }

            // horizontal edges
            if (cir.pos[1] < top && cir.pos[1] > bottom) {
                let diff = cir.pos[0] - (left + right) * 0.5;
                if (Math.abs(diff) < box.dim[0] / 2 + rad) {
                    overlapType = (overlapType === "vertical") ? "middle" : "horizontal";
                    hOverlap = true;
                    hOverlapAmount = -(box.dim[0] / 2 + rad - Math.abs(diff)) * Math.sign(diff);
                }
            }

            // corners (use circle collision)
            if (!hOverlap && !vOverlap) {
                let pivot = [
                    ((cir.pos[0] < (left + right) / 2) ? left : right),
                    ((cir.pos[1] < (bottom + top) / 2) ? bottom : top)
                ];
                let overlapAmount = rad - ce.distance(pivot, cir.pos);
                let overlap = overlapAmount > 0;
                return {
                    overlap: overlap,
                    dir: ce.dirToTarget(cir.pos, pivot),
                    overlapAmount: overlapAmount,
                    type: "corner"
                }
            } else {
                return {
                    overlap: true,
                    type: overlapType,
                    hOverlapAmount: hOverlapAmount,
                    vOverlapAmount: vOverlapAmount
                }
            }
        } else {
            // 2 circles
            let overlapAmount = cA.radius + cB.radius - ce.distance(cA.pos, cB.pos);
            let overlap = overlapAmount > 0;
            return {
                overlap: overlap,
                dir: ce.dirToTarget(cA.pos, cB.pos),
                overlapAmount: overlapAmount
            }
        }
    }

    static bounce(dirPerpToSurface, startingVelo, speedRetentionRate = 1) {
        let vi = [ // direction, magnitude
            ce.dirToTarget([0, 0], startingVelo),
            ce.distance([0, 0], startingVelo)
        ]
        let theta = dirPerpToSurface;
        // rotate by -theta
        vi[0] -= theta;
        // get x,y velocity
        let vj = ce.move([0, 0], vi[0], vi[1]);
        // flip x of vj
        vj[0] = -vj[0] * speedRetentionRate;
        // get vf
        let vf = [ // direction, magnitude
            ce.dirToTarget([0, 0], vj),
            ce.distance([0, 0], vj)
        ]
        // rotate by +theta
        vf[0] += theta;
        // set velocity
        return ce.move([0, 0], vf[0], vf[1]);
    }

    static segIntersect(endPosA, endPosB, endPosC, endPosD, returnIntPos = false) { // returns if two line segments intersect
        /* line segments:
        1: a -> b
        2: c -> d
        */
        
        // ensure endPosA has lower x than endPosB
        if (endPosA[0] > endPosB[0]) {
            let temp = [endPosA[0], endPosA[1]];
            endPosA = endPosB;
            endPosB = temp;
        }

        // ensure endPosC has lower x than endPosD
        if (endPosC[0] > endPosD[0]) {
            let temp = [endPosC[0], endPosC[1]];
            endPosC = endPosD;
            endPosD = temp;
        }

        // shorter aliases
        let a = endPosA;
        let b = endPosB;
        let c = endPosC;
        let d = endPosD;

        // test to see if x and y ranges overlap
        if (a[0] > d[0] ||
            b[0] < c[0] ||
            Math.min(a[1], b[1]) > Math.max(c[1], d[1]) ||
            Math.max(a[1], b[1]) < Math.min(c[1], d[1])) {
                return (returnIntPos)? null : false;
        }

        // slope calculation
        let k1;
        if (b[0] === a[0]) k1 = null;
        else k1 = (b[1] - a[1]) / (b[0] - a[0]);

        let k2;
        if (d[0] === c[0]) k2 = null;
        else k2 = (d[1] - c[1]) / (d[0] - c[0]);

        if (k1 == null && k2 == null) { // parallel vertical line collision
            let intersects = a[0] == c[0];
            if (returnIntPos) {
                if (intersects) return [a[0], a[1]];
                else return null;
            } else return intersects;
        } else if (k1 === k2) { // parallel line collision
            let i1 = a[1] - k1 * a[0]; // yint 1
            let i2 = c[1] - k2 * c[0]; // yint 2
            let intersects = i1 === i2;
            if (returnIntPos) {
                if (intersects) return [a[0], a[1]];
                else return null;
            } else return intersects;
        } else if (k1 == null || k2 == null) { // vertical line collision
            let i; // yint
            let k; // slope
            let x; // x val of vertical line
            if (k1 == null) { // line 1 vertical
                i = c[1] - k2 * c[0];
                k = k2;
                x = a[0];
            } else { // line 2 vertical
                i = a[1] - k1 * a[0];
                k = k1;
                x = c[0];
            }
            let y = k * x + i; // y where lines intersect
            
            // check if y in range of both lines
            let intersects = Math.min(a[1], b[1]) <= y && y <= Math.max(a[1], b[1]) && Math.min(c[1], d[1]) <= y && y <= Math.max(c[1], d[1]);
            if (returnIntPos) {
                if (intersects) return [x, y];
                else return null;
            } else return intersects;
        } else { // normal line segment intersection calculation
            let i1 = a[1] - k1 * a[0]; // yint 1
            let i2 = c[1] - k2 * c[0]; // yint 2
            let x = (i2 - i1) / (k1 - k2); // x where lines intersect

            // check if x in range of both lines
            let intersects = a[0] <= x && x <= b[0] && c[0] <= x && x <= d[0]
            if (returnIntPos) {
                if (intersects) return [x, i1 + k1 * x];
                else return null;
            } else return intersects;
        }
    }
}

class HitBox extends Collision { // rectangular collision boundaries
    dim = [100, 100];
    constructor(pos, dim, solid = false) {
        super(pos)
        // pos represents topleft corner
        this.dim = dim;
        this.type = "box";
        this.solid = solid;
    }
    clone(template = false) {
        let c = new HitBox(ce.cloneObj(this.pos), ce.cloneObj(this.dim), this.solid, template);
        if (this.river) c.river = true;
        return c;
    }
    getBounds() {
        return [
            this.pos[0],
            this.pos[1],
            this.pos[0]+this.dim[0],
            this.pos[1]+this.dim[1],
        ];
    }
    segIntersect(pointA, pointB) {
        // test if either point is inside the box
        if (this.pos[0] <= pointA[0] && pointA[0] <= this.pos[0]+this.dim[0] && this.pos[1] <= pointA[1] && pointA[1] <= this.pos[1]+this.dim[1])
            return true;
        if (this.pos[0] <= pointB[0] && pointB[0] <= this.pos[0]+this.dim[0] && this.pos[1] <= pointB[1] && pointB[1] <= this.pos[1]+this.dim[1])
            return true;

        // bottom edge
        if (Collision.segIntersect(pointA, pointB, [this.pos[0], this.pos[1]], [this.pos[0]+this.dim[0], this.pos[1]]))
            return true;

        // left edge
        if (Collision.segIntersect(pointA, pointB, [this.pos[0], this.pos[1]], [this.pos[0], this.pos[1]+this.dim[1]]))
            return true;
        
        // top edge
        if (Collision.segIntersect(pointA, pointB, [this.pos[0], this.pos[1]+this.dim[1]], [this.pos[0]+this.dim[0], this.pos[1]+this.dim[1]]))
            return true;

        // right edge
        if (Collision.segIntersect(pointA, pointB, [this.pos[0]+this.dim[0], this.pos[1]], [this.pos[0]+this.dim[0], this.pos[1]+this.dim[1]]))
            return true;
        
        return false;
    }
    inBounds(pos) { // tests if point is in bounds
        return this.pos[0] <= pos[0] && pos[0] <= this.pos[0]+this.dim[0] && this.pos[1] <= pos[1] && pos[1] <= this.pos[1]+this.dim[1];
    }
}

class HitCircle extends Collision { // circular collision boundaries
    radius = 10;
    constructor(pos, radius, solid = false) {
        super(pos)
        // pos represents topleft corner
        this.radius = radius;
        this.type = "circle";
        this.solid = solid;
    }
    clone(template = false) {
        let c = new HitCircle(ce.cloneObj(this.pos), this.radius, this.solid, template);
        if (this.river) c.river = true;
        return c;
    }
    getBounds() {
        return [
            this.pos[0]-this.radius,
            this.pos[1]-this.radius,
            this.pos[0]+this.radius,
            this.pos[1]+this.radius,
        ];
    }
    segIntersect(pointA, pointB) {
        // test if endpoints within circle
        if (ce.distance(pointA, this.pos, false) <= this.radius**2 || ce.distance(pointB, this.pos, false) <= this.radius**2) {
            return true;
        }
        let deltaPos = ce.move([0, 0], ce.dirToTarget(pointA, pointB), 1);
        let slope = deltaPos[1]/deltaPos[0]
        // v = vector from seg start to circle pos
        let v = [this.pos[0] - pointA[0], this.pos[1] - pointA[1]]
        // dotProduct = dot product of deltaPos and v
        let dotProduct = v[0]*deltaPos[0] + v[1]*deltaPos[1]
        // mag = magnitude of deltaPos
        let mag = Math.sqrt(deltaPos[0]**2+deltaPos[1]**2)
        // mag2 = magnitude of v
        let mag2 = Math.sqrt(v[0]**2 + v[1] ** 2)
        // comp = scalar projection from v onto deltaPos of the seg
        let comp = dotProduct/mag
        // distance from line to middle of circle
        let distance = Math.sqrt(mag2**2 - comp**2)
        let withinLength = true;
        let length = ce.distance(pointA, pointB);
        if (Math.sign(comp)*Math.sign(length) === -1) {
            withinLength = false
        }
        if (Math.sign(length) * comp > Math.sign(length) * length) {
            withinLength = false
        }
        return (withinLength && distance <= this.radius)
    }
    inBounds(pos) { // tests if point is in bounds
        return ce.distance(this.pos, pos, false) <= this.radius**2;
    }
}