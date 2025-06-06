from flask import Flask, request, jsonify
from flask_cors import CORS
import torch
import torch.nn as nn
import torch.optim as optim
from collections import deque
import random

app = Flask(__name__)
CORS(app)

# Гиперпараметры
BATCH_SIZE = 32
GAMMA = 0.99
LEARNING_RATE = 0.001
MEMORY_SIZE = 10000
INPUT_SIZE = 8  # позиция игрока (2) + ближайшие машины (3 * 2)
HIDDEN_SIZE = 64
OUTPUT_SIZE = 3  # up, down, right


# Нейронная сеть
class DQN(nn.Module):
    def __init__(self):
        super(DQN, self).__init__()
        self.fc1 = nn.Linear(INPUT_SIZE, HIDDEN_SIZE)
        self.fc2 = nn.Linear(HIDDEN_SIZE, HIDDEN_SIZE)
        self.fc3 = nn.Linear(HIDDEN_SIZE, OUTPUT_SIZE)

    def forward(self, x):
        x = torch.relu(self.fc1(x))
        x = torch.relu(self.fc2(x))
        return self.fc3(x)


# Память для реплея
class ReplayMemory:
    def __init__(self, capacity):
        self.memory = deque(maxlen=capacity)

    def push(self, state, action, reward, next_state):
        self.memory.append((state, action, reward, next_state))

    def sample(self, batch_size):
        return random.sample(self.memory, batch_size)

    def __len__(self):
        return len(self.memory)


# Инициализация
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
policy_net = DQN().to(device)
target_net = DQN().to(device)
target_net.load_state_dict(policy_net.state_dict())
optimizer = optim.Adam(policy_net.parameters(), lr=LEARNING_RATE)
memory = ReplayMemory(MEMORY_SIZE)


def process_state(state_data):
    # Преобразуем состояние игры в вектор для нейронной сети
    state_vector = []

    # Добавляем позицию игрока
    state_vector.extend([
        state_data['playerX'] / 20,  # Нормализуем значения
        state_data['playerY'] / 15
    ])

    # Добавляем информацию о ближайших машинах
    cars = state_data['nearestCars']
    for car in cars:
        if car is None:
            state_vector.extend([0, 0])  # Если машины нет, добавляем нули
        else:
            state_vector.extend([
                (car['x'] - state_data['playerX']) / 20,  # Относительная позиция
                (car['y'] - state_data['playerY']) / 15
            ])

    return torch.tensor(state_vector, dtype=torch.float32).unsqueeze(0)


def optimize_model():
    if len(memory) < BATCH_SIZE:
        return

    transitions = memory.sample(BATCH_SIZE)
    batch = list(zip(*transitions))

    state_batch = torch.cat(batch[0])
    action_batch = torch.tensor(batch[1], device=device)
    reward_batch = torch.tensor(batch[2], device=device)
    next_state_batch = torch.cat(batch[3])

    # Вычисляем Q-значения для текущих состояний
    current_q_values = policy_net(state_batch).gather(1, action_batch.unsqueeze(1))

    # Вычисляем Q-значения для следующих состояний
    next_q_values = target_net(next_state_batch).max(1)[0].detach()
    expected_q_values = reward_batch + GAMMA * next_q_values

    # Вычисляем loss и оптимизируем
    loss = nn.MSELoss()(current_q_values.squeeze(), expected_q_values)
    optimizer.zero_grad()
    loss.backward()
    optimizer.step()


@app.route('/train', methods=['POST'])
def train():
    data = request.json

    state = process_state(data['state'])
    action = data['action']
    reward = data['reward']
    next_state = process_state(data['next_state'])

    # Сохраняем переход в память
    memory.push(state, action, reward, next_state)

    # Обучаем модель
    optimize_model()

    # Периодически обновляем target network
    if data.get('episode_end', False):
        target_net.load_state_dict(policy_net.state_dict())

    return jsonify({'status': 'success'})


@app.route('/predict', methods=['POST'])
def predict():
    data = request.json
    state = process_state(data['state'])

    # Получаем предсказание от сети
    with torch.no_grad():
        q_values = policy_net(state)
        action = q_values.max(1)[1].item()

    return jsonify({'action': action})


@app.route('/save_model', methods=['POST'])
def save_model():
    torch.save({
        'policy_net_state_dict': policy_net.state_dict(),
        'optimizer_state_dict': optimizer.state_dict(),
    }, 'model.pth')
    return jsonify({'status': 'success'})


@app.route('/load_model', methods=['POST'])
def load_model():
    try:
        checkpoint = torch.load('model.pth')
        policy_net.load_state_dict(checkpoint['policy_net_state_dict'])
        optimizer.load_state_dict(checkpoint['optimizer_state_dict'])
        target_net.load_state_dict(policy_net.state_dict())
        return jsonify({'status': 'success'})
    except:
        return jsonify({'status': 'error', 'message': 'Model not found'})


if __name__ == '__main__':
    app.run(port=5000)
