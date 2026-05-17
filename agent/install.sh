#!/bin/bash
set -e

TOKEN=$1
API_URL=${2:-"http://localhost:8000"}

if [ -z "$TOKEN" ]; then
    echo "Использование: curl -sSL $API_URL/api/agent/install.sh | bash -s AGENT_TOKEN"
    exit 1
fi

echo "🚀 DevOps Agent — Установка..."
echo ""

echo "📦 Установка пакетов..."
apt-get update -qq
apt-get install -y -qq python3 python3-pip python3-venv curl git

echo "📥 Загрузка агента..."
mkdir -p /opt/devops-agent
curl -sSL $API_URL/api/agent/agent.py -o /opt/devops-agent/agent.py

echo "AGENT_TOKEN=$TOKEN" > /opt/devops-agent/.env
echo "API_URL=$(echo $API_URL | sed 's|http|ws|')/ws/agent" >> /opt/devops-agent/.env
echo "ALLOW_INSECURE_TLS=true" >> /opt/devops-agent/.env

echo "📦 Создание виртуального окружения..."
python3 -m venv /opt/devops-agent/venv

echo "📦 Установка зависимостей Python..."
/opt/devops-agent/venv/bin/pip install -q websockets psutil requests python-dotenv

echo "⚙️ Настройка автозапуска..."
cat > /etc/systemd/system/devops-agent.service << EOF
[Unit]
Description=DevOps Agent
After=network.target

[Service]
Type=simple
ExecStart=/opt/devops-agent/venv/bin/python3 /opt/devops-agent/agent.py
WorkingDirectory=/opt/devops-agent
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable devops-agent
systemctl start devops-agent

sleep 2

if systemctl is-active --quiet devops-agent; then
    echo ""
    echo "✅ Агент запущен и работает!"
    echo "📋 Статус: systemctl status devops-agent"
    echo "📋 Логи: journalctl -u devops-agent -f"
else
    echo "❌ Ошибка запуска. Проверьте: journalctl -u devops-agent"
fi