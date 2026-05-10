#!/bin/bash
set -e

echo "🚀 DevOps WebApp — Полный запуск"
echo ""

# 1. Docker
if ! docker ps &> /dev/null; then
    echo "❌ Docker не запущен. Запустите Docker Desktop."
    exit 1
fi
echo "✅ Docker работает"

# 2. .env
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ .env создан из .env.example (замените токены на реальные)"
fi

# 3. PostgreSQL
echo "🐘 Запуск PostgreSQL..."
docker compose up -d postgres
sleep 3
echo "✅ PostgreSQL запущен"

# 4. Prometheus + Blackbox + Node Exporter
echo "📊 Запуск мониторинга..."
docker compose up -d prometheus blackbox node-exporter
sleep 3
echo "✅ Мониторинг запущен"

# 5. API
echo "🔧 Сборка и запуск API..."
docker compose build api
docker compose up -d api
sleep 5
echo "✅ API запущен"

# 6. Проверка
echo ""
echo "🔍 Проверка..."
if curl -s http://localhost:8000/health | grep -q "healthy"; then
    echo ""
    echo "🎉 ГОТОВО!"
    echo ""
    echo "📋 Доступные сервисы:"
    echo "   API:         http://localhost:8000"
    echo "   Swagger:     http://localhost:8000/docs"
    echo "   Prometheus:  http://localhost:9090"
    echo "   Фронтенд:    http://localhost:5173"
else
    echo "❌ Ошибка: проверьте логи командой: docker compose logs api"
fi