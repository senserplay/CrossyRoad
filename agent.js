class QLearningAgent {
    constructor() {
        this.learningRate = 0.1;
        this.discountFactor = 0.95;
        this.epsilon = 1.0;
        this.epsilonMin = 0.01;
        this.epsilonDecay = 0.995;
        this.actions = ['up', 'down', 'right'];
        this.qTable = new Map();
        
        // Добавляем счетчик шагов для отладки
        this.stepCount = 0;
        this.lastAction = null;
        this.consecutiveSameActions = 0;
    }

    getStateKey(state) {
        // Упрощаем представление состояния
        const playerKey = `${state.playerX},${state.playerY}`;
        
        // Находим ближайшие препятствия
        const nearestCars = state.nearestCars
            .filter(car => car !== null)
            .map(car => `${car.x},${car.y},${car.direction}`)
            .join('|');
            
        // Находим ближайшие дороги
        const nearestRoads = state.nearestRoads
            .filter(road => Math.abs(road.x - state.playerX) <= 3)
            .map(road => `${road.x},${road.direction}`)
            .join('|');

        return `${playerKey}|${nearestCars}|${nearestRoads}`;
    }

    getAction(state) {
        this.stepCount++;
        
        // Увеличиваем вероятность исследования, если агент застрял
        if (this.lastAction !== null) {
            if (state.playerX === this.lastPlayerX && state.playerY === this.lastPlayerY) {
                this.consecutiveSameActions++;
                if (this.consecutiveSameActions > 3) {
                    this.epsilon = Math.min(1.0, this.epsilon + 0.1);
                    this.consecutiveSameActions = 0;
                }
            } else {
                this.consecutiveSameActions = 0;
            }
        }

        // Сохраняем текущее положение для следующей проверки
        this.lastPlayerX = state.playerX;
        this.lastPlayerY = state.playerY;

        // Принудительно двигаемся вправо, если долго стоим на месте
        if (this.consecutiveSameActions > 5) {
            this.lastAction = 'right';
            return 'right';
        }

        if (Math.random() < this.epsilon) {
            // При исследовании увеличиваем вероятность движения вправо
            if (Math.random() < 0.6) {
                this.lastAction = 'right';
                return 'right';
            }
            const action = this.actions[Math.floor(Math.random() * this.actions.length)];
            this.lastAction = action;
            return action;
        }

        const action = this.getBestAction(state);
        this.lastAction = action;
        return action;
    }

    getBestAction(state) {
        const stateKey = this.getStateKey(state);
        if (!this.qTable.has(stateKey)) {
            this.qTable.set(stateKey, {});
            this.actions.forEach(action => {
                // Инициализируем значения Q-таблицы с небольшим бонусом для движения вправо
                this.qTable.get(stateKey)[action] = action === 'right' ? 0.1 : 0;
            });
        }

        const qValues = this.qTable.get(stateKey);
        
        // Если все значения равны, предпочитаем движение вправо
        const maxQ = Math.max(...Object.values(qValues));
        const bestActions = Object.entries(qValues)
            .filter(([_, value]) => value === maxQ)
            .map(([action, _]) => action);

        if (bestActions.includes('right')) {
            return 'right';
        }
        
        return bestActions[Math.floor(Math.random() * bestActions.length)];
    }

    learn(state, action, reward, nextState) {
        const stateKey = this.getStateKey(state);
        const nextStateKey = this.getStateKey(nextState);

        // Инициализация Q-значений
        if (!this.qTable.has(stateKey)) {
            this.qTable.set(stateKey, {});
            this.actions.forEach(action => {
                this.qTable.get(stateKey)[action] = action === 'right' ? 0.1 : 0;
            });
        }
        if (!this.qTable.has(nextStateKey)) {
            this.qTable.set(nextStateKey, {});
            this.actions.forEach(action => {
                this.qTable.get(nextStateKey)[action] = action === 'right' ? 0.1 : 0;
            });
        }

        // Добавляем небольшой бонус за движение вправо
        if (action === 'right') {
            reward += 0.1;
        }

        // Q-learning обновление
        const currentQ = this.qTable.get(stateKey)[action];
        const nextMaxQ = Math.max(...Object.values(this.qTable.get(nextStateKey)));
        const newQ = currentQ + this.learningRate * (reward + this.discountFactor * nextMaxQ - currentQ);

        this.qTable.get(stateKey)[action] = newQ;

        // Обновление epsilon с более медленным затуханием
        if (this.epsilon > this.epsilonMin) {
            this.epsilon *= this.epsilonDecay;
        }
    }
}

// Создаем агента
const agent = new QLearningAgent();

// Функция для обучения агента
function trainAgent() {
    if (game.isGameOver) {
        game.reset();
        // Сбрасываем счетчики при новом эпизоде
        agent.consecutiveSameActions = 0;
        agent.lastAction = null;
        // Немного увеличиваем epsilon при начале нового эпизода
        agent.epsilon = Math.min(1.0, agent.epsilon + 0.1);
    }

    const currentState = game.getState();
    const action = agent.getAction(currentState);
    const reward = game.movePlayer(action);
    const nextState = game.getState();

    agent.learn(currentState, action, reward, nextState);

    // Планируем следующий шаг обучения
    setTimeout(trainAgent, 100);
}

// Начинаем обучение
setTimeout(trainAgent, 1000); 