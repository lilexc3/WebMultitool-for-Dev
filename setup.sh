#!/bin/bash
set -e

echo "🚀 DevOps WebApp — Запуск"
echo ""

# 1. Docker
if ! docker ps &> /dev/null; then
    echo "❌ Docker не запущен"
    exit 1
fi

# 2. .env файлы
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ .env создан из .env.example"
fi

if [ ! -f agent/.env ]; then
    cp agent/.env.example agent/.env
    echo "✅ agent/.env создан из agent/.env.example"
fi

# 3. Директории
mkdir -p monitoring/prometheus/file_sd

# 4. PostgreSQL
echo "🐘 PostgreSQL..."
docker compose up -d postgres
sleep 5

# 5. Мониторинг
echo "📊 Prometheus + Blackbox + Node Exporter..."
docker compose up -d prometheus blackbox node-exporter
sleep 3

# 6. API
echo "🔧 API..."
docker compose build api
docker compose up -d api
sleep 10

# 7. Grafana + Alert Bot
echo "📈 Grafana + Alert Bot..."
docker compose up -d grafana
sleep 3

# 8. Проверка
echo ""
echo "🔍 Проверка..."
curl -s http://localhost:8000/health | grep -q "healthy" && echo "✅ API: http://localhost:8000" || echo "❌ API не отвечает"
curl -s http://localhost:9090/-/healthy | grep -q "Prometheus" && echo "✅ Prometheus: http://localhost:9090" || echo "❌ Prometheus не отвечает"
curl -s http://localhost:3100/api/health | grep -q "ok" && echo "✅ Grafana: http://localhost:3100 (admin/admin)" || echo "⚠️  Grafana запускается"

echo ""
echo "📋 Сервисы:"
echo "   API:         http://localhost:8000"
echo "   Swagger:     http://localhost:8000/docs"
echo "   Prometheus:  http://localhost:9090"
echo "   Grafana:     http://localhost:3100"
echo "   PostgreSQL:  localhost:5433"
echo ""
echo "📦 Агент:"
echo "   1. Создай ноду через API: POST /api/sites/{id}/nodes"
echo "   2. Скопируй agent_token в agent/.env"
echo "   3. Запусти на VPS: cd agent && python agent.py"
echo ""
echo "✅ Готово"