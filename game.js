'use strict';

class Vector {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
    
    plus(vector) {
        if (!(vector instanceof Vector)) {
            throw new Error(`Можно прибавлять к вектору только вектор типа Vector`);
        }
        return new Vector(this.x + vector.x, this.y + vector.y);
    }
    
    times(n = 1) {
        return new Vector(this.x * n, this.y * n);
    }
}

class Actor {
    constructor(pos = new Vector(0, 0), size = new Vector(1, 1), speed = new Vector(0, 0)) {
        if (!(pos instanceof Vector) || !(size instanceof Vector) || !(speed instanceof Vector)) {
            throw new Error(`Расположение, размер и скорость должны быть объектом Vector`);
        }
        this.pos = pos;
        this.size = size;
        this.speed = speed;
    }
    get type() {
        return 'actor';
    }
    act() {

    }
    get left() {
        return this.pos.x;
    }
    get right() {
        return this.pos.x + this.size.x;
    }
    get top() {
        return this.pos.y;
    }
    get bottom() {
        return this.pos.y + this.size.y;
    }
    isIntersect(actor) {
        if (!(actor instanceof Actor) || (!actor)) {
            throw new Error(`Не является экземпляром Actor или не передано аргументов`);
        }
        
       if (actor === this) {
            return false;
       }
        return (
            this.right > actor.left &&
            this.left < actor.right &&
            this.top < actor.bottom &&
            this.bottom > actor.top
        );
    }
}

class Level {
    
    constructor(grid = [], actors = []) {
        this.grid = grid.slice();
        this.actors = actors.slice();
        this.height = this.grid.length;
        this.width = this.grid.reduce((a, b) => {
            return b.length > a ? b.length : a;
        }, 0);
        
        this.status = null;
        
        this.finishDelay = 1;
        
        this.player = this.actors.find(act => act.type === 'player');
    }
    
    isFinished() {
        return this.status !== null && this.finishDelay < 0;
    }
    
    actorAt(actor) {
        if (!(actor instanceof Actor) || (!actor)) {
            throw new Error(`Не является экземпляром Actor или не передано аргументов`);
        }
        
        return this.actors.find(act => act.isIntersect(actor));
    }
    
    obstacleAt(pos, size) {
        if (!(pos instanceof Vector) && !(size instanceof Vector)) {
            throw new Error(`Не является экземпляром Vector или не передано аргументов`);
        }
        const left = Math.floor(pos.x);
        const right = Math.ceil(pos.x + size.x);
        const top = Math.floor(pos.y);
        const bottom = Math.ceil(pos.y + size.y);

        if (left < 0 || right > this.width || top < 0) {
            return 'wall';
        }
        if (bottom > this.height) {
            return 'lava';
        }
        for (let i = top; i < bottom; i++) {
            for (let k = left; k < right; k++) {
                const cross = this.grid[i][k];
                if (cross) {
                    return cross;
                }
            }
        }
    }
    
    removeActor(actor) {
        this.actors = this.actors.filter(el => el !== actor);
    }
    
    noMoreActors(type) {
        return !this.actors.some(el => el.type === type);
    }
    playerTouched(type, actor) {
        if (this.status !== null) {
            return;
        }
        if (type === 'lava' || type === 'fireball') {
            this.status = 'lost';
        }
        if (type === 'coin') {
            this.removeActor(actor);
            if (this.noMoreActors('coin')) {
                this.status = 'won';
            }
        }
    }
}

class LevelParser {
    constructor(map = {}) {
        this.map = map;
    }
    
    actorFromSymbol(symbol) {
        return this.map[symbol];
    }
    
    obstacleFromSymbol(symbol) {
        switch (symbol) {
            case 'x':
                return 'wall';
            case '!':
                return 'lava';
        }
    }
    
    createGrid(plan) {
        return plan.map(el => el.split('')).map(el => el.map(el => this.obstacleFromSymbol(el)));
    }
    
    createActors(plan) {
        return plan.reduce((prev, elem, y) => {
            elem.split('').forEach((count, x) => {
                const func = this.actorFromSymbol(count);
                if (typeof func === 'function') {
                    const actor = new func(new Vector(x, y));
                    if (actor instanceof Actor) {
                        prev.push(actor);
                    }
                }
            });
            return prev;
        }, []);
    }

    parse(arr) {
        return new Level(this.createGrid(arr), this.createActors(arr));
    }
}

class Fireball extends Actor {
    constructor(pos = new Vector(0, 0), speed = new Vector(0, 0)) {
        super(pos, new Vector(1, 1), speed)
    }
    get type() {
        return 'fireball';
    }
    
    getNextPosition(time = 1) {
        return this.pos.plus(this.speed.times(time));
    }
    handleObstacle() {
        this.speed = this.speed.times(-1);
    }
    
    act(time, level) {
        const newPosition = this.getNextPosition(time);
        level.obstacleAt(newPosition, this.size) ? this.handleObstacle() : this.pos = newPosition;
    }
}

class HorizontalFireball extends Fireball {
    constructor(pos = new Vector(0, 0)) {
        super(pos, new Vector(2, 0));
    }
}

class VerticalFireball extends Fireball {
    constructor(pos = new Vector(0, 0)) {
        super(pos, new Vector(0, 2));
    }
}

class FireRain extends Fireball {
    constructor(pos = new Vector(0, 0)) {
        super(pos, new Vector(0, 3));
        this.startPos = pos;
    }
    handleObstacle() {
        this.pos = this.startPos;
    }
}

class Coin extends Actor {
    constructor(pos = new Vector(0, 0)) {
        super(pos.plus(new Vector(0.2, 0.1)), new Vector(0.6, 0.6));
        this.spring = Math.random() * 2 * Math.PI;
        this.springSpeed = 8;
        this.springDist = 0.07;
        this.position = this.pos;
    }
    get type() {
        return 'coin';
    }
    
    updateSpring(time = 1) {
        this.spring = this.spring + this.springSpeed * time;
    }
    
    getSpringVector() {
        return new Vector(0, Math.sin(this.spring) * this.springDist);
    }
    
    getNextPosition(time = 1) {
        this.updateSpring(time);
        return this.position.plus(this.getSpringVector());
    }
   
    act(time) {
        this.pos = this.getNextPosition(time);
    }
}

class Player extends Actor {
    constructor(pos = new Vector(0, 0)) {
        super(pos, new Vector(0.8, 1.5));
        this.pos = this.pos.plus(new Vector(0, -0.5));
    }
    get type() {
        return 'player';
    }
}

const actorDict = {
    '@': Player,
    'v': FireRain,
    'o': Coin,
    '=': HorizontalFireball,
    '|': VerticalFireball

};
const parser = new LevelParser(actorDict);

loadLevels()
    .then((res) => {
        runGame(JSON.parse(res), parser, DOMDisplay)
            .then(() => alert('Вы выиграли!'))
    });

