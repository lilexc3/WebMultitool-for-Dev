#!/bin/bash
set -e

echo "🚀 DevOps WebApp — Автоустановка и запуск"
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
docker compose up -d postgres
sleep 3
echo "✅ PostgreSQL запущен"

# 4. API
docker compose build api
docker compose up -d api
sleep 5
echo "✅ API запущен"

# 5. Проверка
if curl -s http://localhost:8000/health | grep -q "healthy"; then
    echo ""
    echo "🎉 ГОТОВО! API работает: http://localhost:8000"
    echo "📚 Swagger: http://localhost:8000/docs"
else
    echo "❌ Ошибка: проверьте логи командой: docker compose logs api"
fi