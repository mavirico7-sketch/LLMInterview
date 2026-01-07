# Code Challenge Platform

Веб-приложение для решения задач по программированию с Monaco Editor и проверкой через Code Executor.

## Возможности

- 🎨 Современный темный интерфейс
- 📝 Monaco Editor с подсветкой синтаксиса Python
- ⚡ Выполнение кода через Code Executor API
- ✅ Автоматическая проверка решений
- 📊 Детальные результаты тестов

## Запуск

### Предварительные требования

1. Запустите Code Executor (из папки `code-executor`):
```bash
cd ../code-executor
./scripts/build-environments.sh
docker compose up -d
```

2. Создайте общую сеть (если ещё не создана):
```bash
docker network create app-network
```

### Docker (рекомендуется)

**Production mode:**
```bash
docker-compose up --build
```
Приложение будет доступно на http://localhost:3080

**Development mode с hot reload:**
```bash
docker-compose --profile dev up code-challenge-dev
```
Приложение будет доступно на http://localhost:3000

### Локально

```bash
# Установка зависимостей
npm install

# Запуск в режиме разработки
npm run dev

# Сборка для production
npm run build

# Предпросмотр production сборки
npm run preview
```

## Технологии

- React 18
- Vite
- Monaco Editor
- Lucide Icons
- Code Executor API

## Структура проекта

```
code-challenge/
├── src/
│   ├── App.jsx       # Главный компонент
│   ├── App.css       # Стили приложения
│   ├── main.jsx      # Точка входа
│   └── index.css     # Глобальные стили
├── Dockerfile        # Docker образ
├── docker-compose.yml
├── nginx.conf        # Конфиг nginx
└── package.json
```

## API

Приложение использует Code Executor API через nginx proxy на `/api/`.

В Docker контейнере запросы проксируются к сервису `api:8000` (Code Executor) через общую сеть `app-network`.

### Endpoints

- `POST /api/v1/sessions` - создание сессии выполнения
- `GET /api/v1/sessions/{session_id}` - получение статуса сессии
- `POST /api/v1/sessions/{session_id}/execute` - выполнение кода
- `DELETE /api/v1/sessions/{session_id}` - завершение сессии

### Пример использования

```javascript
// Создание сессии
const sessionRes = await fetch('http://localhost:8000/api/v1/sessions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ environment: 'python' })
})
const { session_id } = await sessionRes.json()

// Ожидание готовности сессии
// ...polling GET /api/v1/sessions/{session_id} до status: 'ready'

// Выполнение кода
const result = await fetch(`http://localhost:8000/api/v1/sessions/${session_id}/execute`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    code: 'print("Hello, World!")',
    stdin: '',
    filename: 'main.py'
  })
})
const { stdout, stderr, exit_code, execution_time } = await result.json()
```

Для изменения адреса сервера отредактируйте константу `BASE_URL` в `src/App.jsx`.
