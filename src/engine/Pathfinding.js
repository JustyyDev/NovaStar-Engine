/**
 * NovaStar Pathfinding v0.4
 * A* grid-based pathfinding for AI navigation
 *
 * Usage:
 *   const pf = new Pathfinding(32, 32); // grid size
 *   pf.setWalkable(5, 5, false); // block a cell
 *   const path = pf.findPath(0, 0, 10, 10);
 *   // path = [{x:0,y:0}, {x:1,y:1}, ... {x:10,y:10}]
 */

export class Pathfinding {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.grid = new Array(width * height).fill(true); // true = walkable
    this.costs = new Array(width * height).fill(1); // movement cost per cell
  }

  setWalkable(x, y, walkable) {
    if (this._inBounds(x, y)) this.grid[y * this.width + x] = walkable;
  }

  isWalkable(x, y) {
    return this._inBounds(x, y) && this.grid[y * this.width + x];
  }

  setCost(x, y, cost) {
    if (this._inBounds(x, y)) this.costs[y * this.width + x] = cost;
  }

  setWalkableRect(x, y, w, h, walkable) {
    for (let iy = y; iy < y + h; iy++)
      for (let ix = x; ix < x + w; ix++)
        this.setWalkable(ix, iy, walkable);
  }

  fromTilemap(tilemap, solidTileIds) {
    const solidSet = new Set(solidTileIds);
    for (let y = 0; y < this.height; y++)
      for (let x = 0; x < this.width; x++) {
        const tile = tilemap.getTile?.(0, x, y) ?? tilemap.getTile?.('ground', x, y);
        this.setWalkable(x, y, !solidSet.has(tile));
      }
  }

  findPath(startX, startY, endX, endY, allowDiagonal = true) {
    if (!this._inBounds(startX, startY) || !this._inBounds(endX, endY)) return null;
    if (!this.isWalkable(endX, endY)) return null;

    const open = new MinHeap();
    const closed = new Set();
    const cameFrom = new Map();
    const gScore = new Map();
    const fScore = new Map();

    const key = (x, y) => `${x},${y}`;
    const h = (x, y) => Math.abs(x - endX) + Math.abs(y - endY);

    const startKey = key(startX, startY);
    gScore.set(startKey, 0);
    fScore.set(startKey, h(startX, startY));
    open.push({ x: startX, y: startY, f: h(startX, startY) });

    const dirs = allowDiagonal
      ? [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]]
      : [[-1,0],[1,0],[0,-1],[0,1]];

    while (open.size > 0) {
      const current = open.pop();
      const ck = key(current.x, current.y);

      if (current.x === endX && current.y === endY) {
        const path = [];
        let k = ck;
        while (k) { const [x, y] = k.split(',').map(Number); path.unshift({ x, y }); k = cameFrom.get(k); }
        return path;
      }

      closed.add(ck);

      for (const [dx, dy] of dirs) {
        const nx = current.x + dx, ny = current.y + dy;
        const nk = key(nx, ny);
        if (!this._inBounds(nx, ny) || !this.isWalkable(nx, ny) || closed.has(nk)) continue;
        const moveCost = (dx !== 0 && dy !== 0) ? 1.414 : 1;
        const tentG = (gScore.get(ck) || 0) + moveCost * (this.costs[ny * this.width + nx] || 1);
        if (tentG < (gScore.get(nk) ?? Infinity)) {
          cameFrom.set(nk, ck);
          gScore.set(nk, tentG);
          const f = tentG + h(nx, ny);
          fScore.set(nk, f);
          open.push({ x: nx, y: ny, f });
        }
      }
    }

    return null; // no path found
  }

  findNearestWalkable(x, y, maxRadius = 10) {
    if (this.isWalkable(x, y)) return { x, y };
    for (let r = 1; r <= maxRadius; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dy = -r; dy <= r; dy++) {
          if (Math.abs(dx) === r || Math.abs(dy) === r) {
            if (this.isWalkable(x + dx, y + dy)) return { x: x + dx, y: y + dy };
          }
        }
      }
    }
    return null;
  }

  _inBounds(x, y) { return x >= 0 && x < this.width && y >= 0 && y < this.height; }
}

// Simple min-heap for A*
class MinHeap {
  constructor() { this.data = []; }
  get size() { return this.data.length; }
  push(item) { this.data.push(item); this._bubbleUp(this.data.length - 1); }
  pop() {
    if (this.data.length === 0) return null;
    const top = this.data[0];
    const last = this.data.pop();
    if (this.data.length > 0) { this.data[0] = last; this._sinkDown(0); }
    return top;
  }
  _bubbleUp(i) {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.data[i].f >= this.data[p].f) break;
      [this.data[i], this.data[p]] = [this.data[p], this.data[i]];
      i = p;
    }
  }
  _sinkDown(i) {
    const n = this.data.length;
    while (true) {
      let smallest = i;
      const l = 2 * i + 1, r = 2 * i + 2;
      if (l < n && this.data[l].f < this.data[smallest].f) smallest = l;
      if (r < n && this.data[r].f < this.data[smallest].f) smallest = r;
      if (smallest === i) break;
      [this.data[i], this.data[smallest]] = [this.data[smallest], this.data[i]];
      i = smallest;
    }
  }
}
