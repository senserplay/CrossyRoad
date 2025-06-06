class NeuralAgent {
    constructor() {
        this.epsilon = 1.0;
        this.epsilonMin = 0.01;
        this.epsilonDecay = 0.995;
        this.actions = ['up', 'down', 'right'];
        this.lastState = null;
        this.lastAction = null;
        this.episodeSteps = 0;
    }

    async getAction(state) {
        this.lastState = state;
        
        if (Math.random() < this.epsilon) {
            // Исследование
            this.lastAction = Math.floor(Math.random() * this.actions.length);
            return this.actions[this.lastAction];
        }

        try {
            // Получаем действие от нейронной сети
            const response = await fetch('http://localhost:5000/predict', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ state: state })
            });
            
            const data = await response.json();
            this.lastAction = data.action;
            return this.actions[this.lastAction];
        } catch (error) {
            console.error('Error getting prediction:', error);
            // В случае ошибки используем случайное действие
            this.lastAction = Math.floor(Math.random() * this.actions.length);
            return this.actions[this.lastAction];
        }
    }

    async learn(state, action, reward, nextState, isGameOver) {
        // Обновляем epsilon
        if (this.epsilon > this.epsilonMin) {
            this.epsilon *= this.epsilonDecay;
        }

        this.episodeSteps++;

        try {
            // Отправляем данные для обучения
            await fetch('http://localhost:5000/train', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    state: state,
                    action: this.actions.indexOf(action),
                    reward: reward,
                    next_state: nextState,
                    episode_end: isGameOver
                })
            });
        } catch (error) {
            console.error('Error training:', error);
        }

        if (isGameOver) {
            console.log(`Episode finished after ${this.episodeSteps} steps. Epsilon: ${this.epsilon}`);
            this.episodeSteps = 0;
        }
    }

    async saveModel() {
        try {
            await fetch('http://localhost:5000/save_model', {
                method: 'POST'
            });
            console.log('Model saved successfully');
        } catch (error) {
            console.error('Error saving model:', error);
        }
    }

    async loadModel() {
        try {
            await fetch('http://localhost:5000/load_model', {
                method: 'POST'
            });
            console.log('Model loaded successfully');
        } catch (error) {
            console.error('Error loading model:', error);
        }
    }
}

// Создаем нейронного агента
const agent = new NeuralAgent();

// Функция для обучения агента
async function trainAgent() {
    if (game.isGameOver) {
        game.reset();
    }

    const currentState = game.getState();
    const action = await agent.getAction(currentState);
    const reward = game.movePlayer(action);
    const nextState = game.getState();

    await agent.learn(currentState, action, reward, nextState, game.isGameOver);

    // Планируем следующий шаг обучения
    setTimeout(trainAgent, 100);
}

// Начинаем обучение
setTimeout(async () => {
    await agent.loadModel();  // Пытаемся загрузить сохраненную модель
    trainAgent();
}, 1000);

// Сохраняем модель каждые 5 минут
setInterval(() => {
    agent.saveModel();
}, 5 * 60 * 1000); 