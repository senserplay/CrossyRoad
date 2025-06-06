class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = 800;
        this.canvas.height = 600;
        
        this.cellSize = 40;
        this.gridWidth = Math.floor(this.canvas.width / this.cellSize);
        this.gridHeight = Math.floor(this.canvas.height / this.cellSize);
        
        this.viewportWidth = this.gridWidth;
        this.worldOffset = 0;
        
        this.hitboxSize = this.cellSize * 0.8;
        
        this.player = {
            x: Math.floor(this.viewportWidth / 3),
            y: Math.floor(this.gridHeight / 2),
            size: this.cellSize - 4,
            hitbox: {
                width: this.hitboxSize,
                height: this.hitboxSize
            }
        };
        
        this.score = 0;
        this.maxScore = 0;
        this.episode = 1;
        this.isGameOver = false;
        this.lastTimeUpdate = Date.now();
        this.lastScoreDecrease = Date.now();
        
        this.cars = [];
        this.spawnCarInterval = 15;
        this.frameCount = 0;
        
        this.roadLanes = [];
        this.generateInitialLevel();
        this.init();
    }

    generateInitialLevel() {
        this.roadLanes = [];
        for (let x = 0; x < this.viewportWidth + 10; x++) {
            if (x % 3 === 0 && x > 0) {
                this.roadLanes.push({
                    x: x,
                    direction: Math.random() < 0.5 ? 'up' : 'down',
                    speed: 0.1 + Math.random() * 0.1
                });
            }
        }
    }

    generateNewRoads() {
        const maxX = Math.max(...this.roadLanes.map(lane => lane.x), 0);
        const targetX = this.worldOffset + this.viewportWidth + 5;

        for (let x = maxX + 1; x <= targetX; x++) {
            if (x % 3 === 0) {
                this.roadLanes.push({
                    x: x,
                    direction: Math.random() < 0.5 ? 'up' : 'down',
                    speed: 0.1 + Math.random() * 0.1
                });
            }
        }

        this.roadLanes = this.roadLanes.filter(lane => 
            lane.x >= this.worldOffset - 2
        );
    }

    init() {
        this.updateScoreDisplay();
    }

    spawnCar() {
        const visibleLanes = this.roadLanes.filter(lane => 
            lane.x >= this.worldOffset && 
            lane.x < this.worldOffset + this.viewportWidth
        );

        if (visibleLanes.length > 0 && Math.random() < 0.8) {
            const lane = visibleLanes[Math.floor(Math.random() * visibleLanes.length)];
            this.cars.push({
                x: lane.x,
                y: lane.direction === 'down' ? -1 : this.gridHeight,
                direction: lane.direction,
                speed: lane.speed * 1.2
            });
        }
    }

    updateCars() {
        for (let i = this.cars.length - 1; i >= 0; i--) {
            const car = this.cars[i];
            if (car.direction === 'down') {
                car.y += car.speed;
                if (car.y > this.gridHeight) {
                    this.cars.splice(i, 1);
                }
            } else {
                car.y -= car.speed;
                if (car.y < -1) {
                    this.cars.splice(i, 1);
                }
            }
        }

        this.cars = this.cars.filter(car => 
            car.x >= this.worldOffset - 1 && 
            car.x < this.worldOffset + this.viewportWidth + 1
        );
    }

    checkCollisions() {
        const playerWorldX = this.worldOffset + this.player.x;
        
        const playerLeft = playerWorldX * this.cellSize + (this.cellSize - this.hitboxSize) / 2;
        const playerRight = playerLeft + this.hitboxSize;
        const playerTop = this.player.y * this.cellSize + (this.cellSize - this.hitboxSize) / 2;
        const playerBottom = playerTop + this.hitboxSize;

        for (const car of this.cars) {
            const carLeft = car.x * this.cellSize + (this.cellSize - this.hitboxSize) / 2;
            const carRight = carLeft + this.hitboxSize;
            const carTop = car.y * this.cellSize + (this.cellSize - this.hitboxSize) / 2;
            const carBottom = carTop + this.hitboxSize;

            if (playerLeft < carRight &&
                playerRight > carLeft &&
                playerTop < carBottom &&
                playerBottom > carTop) {
                return true;
            }
        }
        return false;
    }

    movePlayer(action) {
        const oldX = this.player.x;

        switch(action) {
            case 'up':
                if (this.player.y > 0) this.player.y--;
                break;
            case 'down':
                if (this.player.y < this.gridHeight - 1) this.player.y++;
                break;
            case 'right':
                this.worldOffset++;
                this.generateNewRoads();
                this.score += 10;
                this.updateScoreDisplay();
                break;
        }

        if (this.checkCollisions()) {
            this.gameOver();
            return -100;
        }

        return action === 'right' ? 10 : 1;
    }

    gameOver() {
        this.isGameOver = true;
        if (this.score > this.maxScore) {
            this.maxScore = this.score;
        }
        this.updateScoreDisplay();
    }

    reset() {
        this.player.x = Math.floor(this.viewportWidth / 3);
        this.player.y = Math.floor(this.gridHeight / 2);
        this.worldOffset = 0;
        this.score = 0;
        this.cars = [];
        this.isGameOver = false;
        this.episode++;
        this.lastTimeUpdate = Date.now();
        this.lastScoreDecrease = Date.now();
        this.generateInitialLevel();
        this.updateScoreDisplay();
    }

    updateScoreDisplay() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('maxScore').textContent = this.maxScore;
        document.getElementById('episode').textContent = this.episode;
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        for (let x = 0; x < this.viewportWidth; x++) {
            const worldX = this.worldOffset + x;
            for (let y = 0; y < this.gridHeight; y++) {
                const isRoad = this.roadLanes.some(lane => lane.x === worldX);
                
                this.ctx.fillStyle = isRoad ? '#666' : '#4a4a4a';
                this.ctx.fillRect(
                    x * this.cellSize,
                    y * this.cellSize,
                    this.cellSize,
                    this.cellSize
                );
                
                this.ctx.strokeStyle = '#555';
                this.ctx.strokeRect(
                    x * this.cellSize,
                    y * this.cellSize,
                    this.cellSize,
                    this.cellSize
                );
            }
        }

        const playerScreenX = this.player.x * this.cellSize;
        const playerScreenY = this.player.y * this.cellSize;

        this.ctx.fillStyle = 'rgba(76, 175, 80, 0.3)';
        this.ctx.fillRect(
            playerScreenX + (this.cellSize - this.hitboxSize) / 2,
            playerScreenY + (this.cellSize - this.hitboxSize) / 2,
            this.hitboxSize,
            this.hitboxSize
        );

        this.ctx.fillStyle = '#4CAF50';
        this.ctx.fillRect(
            playerScreenX + 2,
            playerScreenY + 2,
            this.player.size,
            this.player.size
        );

        for (const car of this.cars) {
            const screenX = car.x - this.worldOffset;
            if (screenX >= 0 && screenX < this.viewportWidth) {
                const carScreenX = screenX * this.cellSize;
                const carScreenY = car.y * this.cellSize;

                this.ctx.fillStyle = 'rgba(244, 67, 54, 0.3)';
                this.ctx.fillRect(
                    carScreenX + (this.cellSize - this.hitboxSize) / 2,
                    carScreenY + (this.cellSize - this.hitboxSize) / 2,
                    this.hitboxSize,
                    this.hitboxSize
                );

                this.ctx.fillStyle = '#f44336';
                this.ctx.fillRect(
                    carScreenX + 2,
                    carScreenY + 2,
                    this.cellSize - 4,
                    this.cellSize - 4
                );
            }
        }
    }

    update() {
        if (!this.isGameOver) {
            const currentTime = Date.now();
            
            // Проверяем, прошла ли секунда с последнего уменьшения очков
            if (currentTime - this.lastScoreDecrease >= 1000) {
                this.score = Math.max(0, this.score - 1);
                this.lastScoreDecrease = currentTime;
                this.updateScoreDisplay();
            }
            
            this.frameCount++;
            if (this.frameCount % this.spawnCarInterval === 0) {
                this.spawnCar();
            }
            this.updateCars();
        }
        this.draw();
    }

    getState() {
        const playerWorldX = this.worldOffset + this.player.x;
        const visibleCars = this.cars.filter(car => 
            Math.abs(car.x - playerWorldX) <= this.viewportWidth
        );

        return {
            playerX: this.player.x,
            playerY: this.player.y,
            worldOffset: this.worldOffset,
            nearestCars: this.getNearestCars(visibleCars),
            nearestRoads: this.roadLanes
                .filter(lane => Math.abs(lane.x - playerWorldX) <= this.viewportWidth)
                .map(lane => ({x: lane.x - this.worldOffset, direction: lane.direction}))
        };
    }

    getNearestCars(visibleCars) {
        const playerWorldX = this.worldOffset + this.player.x;
        const sortedCars = visibleCars
            .sort((a, b) => Math.abs(a.x - playerWorldX) - Math.abs(b.x - playerWorldX));

        const nearestCars = [];
        for (let i = 0; i < 3; i++) {
            if (i < sortedCars.length) {
                nearestCars.push({
                    x: sortedCars[i].x - this.worldOffset,
                    y: sortedCars[i].y,
                    direction: sortedCars[i].direction
                });
            } else {
                nearestCars.push(null);
            }
        }
        return nearestCars;
    }
}

const game = new Game();

function gameLoop() {
    game.update();
    requestAnimationFrame(gameLoop);
}

gameLoop(); 