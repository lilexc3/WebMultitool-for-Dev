# DevOps WebApp

Платформа для управления сайтами с мониторингом 24/7, автоматическим деплоем и откатом.

## Что умеет проект

### API Сервер
- Создание, просмотр, обновление и удаление сайтов
- Проверка доступности любого URL (HTTP статус, время ответа)
- Полная статистика сайта: HTTP, Ping, DNS, SSL
- Запуск деплоя и отката через агента или GitLab CI/CD
- Получение метрик из Prometheus (uptime за 24 часа, текущий статус)
- WebSocket для подключения агентов с серверов клиентов
- Статистика самого сервера: CPU, RAM, диск, Load Average

### Агент для сервера клиента
- Подключается к API через WebSocket и держит постоянное соединение
- Собирает метрики системы каждые 15 секунд (CPU, память, диск)
- Выполняет команду deploy: git pull и перезапуск Docker контейнеров
- Выполняет команду rollback: откат к предыдущему коммиту
- Умеет перезапускать nginx (systemctl или docker)
- Упакован в Docker для простой установки

### Мониторинг
- Prometheus собирает метрики доступности всех сайтов
- Blackbox Exporter проверяет сайты по HTTP/HTTPS каждые 15 секунд
- Alertmanager отправляет алерты в Telegram при падении сайта
- При создании нового сайта он автоматически добавляется в мониторинг

### База данных
- SQLite, три таблицы: пользователи, сайты, активные соединения агентов
- У каждого сайта есть уникальный agent_token для безопасного подключения

### Публичный доступ
- Ngrok туннель даёт постоянный публичный URL
- Работает WebSocket через wss
- Можно тестировать с реальными серверами из интернета

## Как запустить

1. Установите зависимости:
   pip install -r backend/requirements.txt

2. Создайте файл .env с переменными окружения (пример в .env.example)

3. Инициализируйте базу данных:
   python3 backend/app/database.py

4. Запустите мониторинг:
   cd monitoring
   docker-compose -f docker-compose.monitoring.yml up -d

5. Запустите API:
   ./run_api.sh

6. Откройте документацию API:
   http://localhost:8000/docs

## Как запустить агента

1. Перейдите в папку agent
2. Создайте файл .env с токеном:
   AGENT_TOKEN=полученный_при_создании_сайта
   API_URL=ws://localhost:8000/ws/agent

3. Запустите:
   python3 agent.py

## Структура проекта

devops-webapp/
├── backend/
│   ├── app/
│   │   ├── main.py        # FastAPI приложение
│   │   ├── models.py      # Pydantic модели
│   │   ├── database.py    # Работа с SQLite
│   │   └── websocket.py   # Менеджер WebSocket соединений
│   └── core/
│       ├── site_checks.py # Проверка сайтов (HTTP, Ping, DNS, SSL)
│       ├── server_stats.py # Статистика сервера из Prometheus
│       └── deploy.py      # Интеграция с GitLab API
├── agent/
│   └── agent.py           # Агент для сервера клиента
├── monitoring/
│   ├── docker-compose.monitoring.yml
│   ├── prometheus/
│   │   ├── prometheus.yml
│   │   ├── alert.rules.yml
│   │   └── file_sd/
│   │       └── targets.json  # Автоматически обновляется
│   ├── blackbox/
│   │   └── blackbox.yml
│   └── alertmanager/
│       └── alertmanager.yml
├── data/
│   └── sites.db           # База данных SQLite
├── .env                   # Переменные окружения
├── .env.example           # Пример конфигурации
├── run_api.sh             # Скрипт запуска API
└── README.md

## Основные эндпоинты API

GET    /health                    - проверка работоспособности
GET    /api/sites                 - список всех сайтов
POST   /api/sites                 - создать сайт (возвращает agent_token)
GET    /api/sites/online          - сайты с активными агентами
POST   /api/sites/check           - проверить любой URL
GET    /api/sites/{id}            - информация о сайте
PUT    /api/sites/{id}            - обновить сайт
DELETE /api/sites/{id}            - удалить сайт
POST   /api/sites/{id}/check      - проверить сайт по ID
POST   /api/sites/{id}/full-stats - полная статистика (HTTP, Ping, DNS, SSL)
POST   /api/sites/{id}/deploy     - запустить деплой
POST   /api/sites/{id}/rollback   - запустить откат
GET    /api/sites/{id}/metrics    - метрики из Prometheus (is_up, uptime_24h)
GET    /api/server/stats          - статистика сервера (CPU, RAM, диск)
WS     /ws/agent/{token}          - WebSocket для агентов

## Переменные окружения (.env)

TELEGRAM_BOT_TOKEN    - токен бота для алертов
TELEGRAM_CHAT_ID      - ID чата для алертов
GITLAB_URL            - URL вашего GitLab
GITLAB_TOKEN          - токен для GitLab API
GITLAB_PROJECT_ID     - ID проекта в GitLab
PROMETHEUS_URL        - URL Prometheus (по умолчанию http://localhost:9090)
DB_PATH               - путь к базе данных (./data/sites.db)