#!/usr/bin/env python3
"""
DevOps Agent — запускается на сервере клиента
Подключается к центральному API и выполняет команды
"""
import os
import json
import asyncio
import subprocess
import logging
import socket
from datetime import datetime
from pathlib import Path

# Загружаем .env из папки агента
env_path = Path(__file__).parent / '.env'
if env_path.exists():
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                os.environ[key] = value

# Установите: pip install websockets psutil requests
try:
    import websockets
    import psutil
    import requests
except ImportError:
    print("Установите зависимости: pip install websockets psutil requests")
    exit(1)

AGENT_TOKEN = os.getenv('AGENT_TOKEN')
API_URL = os.getenv('API_URL', 'ws://localhost:8000/ws/agent')
SITE_PATH = os.getenv('SITE_PATH', '/var/www/site')
REPO_URL = os.getenv('REPO_URL', '')
BRANCH = os.getenv('BRANCH', 'main')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class DevOpsAgent:
    def __init__(self):
        self.token = AGENT_TOKEN
        self.api_url = API_URL
        self.connected = False
        self.hostname = socket.gethostname()
        
    def get_system_stats(self) -> dict:
        """Сбор метрик системы"""
        try:
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            load_avg = psutil.getloadavg()
            
            return {
                'cpu_percent': cpu_percent,
                'memory_percent': memory.percent,
                'memory_used_gb': round(memory.used / 1024**3, 2),
                'memory_total_gb': round(memory.total / 1024**3, 2),
                'disk_percent': disk.percent,
                'disk_free_gb': round(disk.free / 1024**3, 2),
                'disk_total_gb': round(disk.total / 1024**3, 2),
                'load_1': load_avg[0],
                'load_5': load_avg[1],
                'load_15': load_avg[2],
                'hostname': self.hostname,
                'timestamp': datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"Error getting stats: {e}")
            return {'error': str(e)}
    
    def execute_deploy(self, params: dict = None) -> dict:
        """Выполнить деплой"""
        logger.info("🚀 Starting deployment...")
        
        repo_url = params.get('repo_url', REPO_URL) if params else REPO_URL
        branch = params.get('branch', BRANCH) if params else BRANCH
        
        if not repo_url:
            return {"status": "error", "message": "No repository URL configured"}
        
        try:
            if not os.path.exists(SITE_PATH):
                cmd = ['git', 'clone', '-b', branch, repo_url, SITE_PATH]
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
                if result.returncode != 0:
                    return {"status": "error", "message": f"Git clone failed: {result.stderr}"}
            else:
                os.chdir(SITE_PATH)
                cmd = ['git', 'pull', 'origin', branch]
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
                if result.returncode != 0:
                    return {"status": "error", "message": f"Git pull failed: {result.stderr}"}
            
            if os.path.exists(os.path.join(SITE_PATH, 'docker-compose.yml')):
                os.chdir(SITE_PATH)
                cmd = ['docker', 'compose', 'up', '-d', '--build']
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
                if result.returncode != 0:
                    return {"status": "error", "message": f"Docker compose failed: {result.stderr}"}
            
            return {
                "status": "success",
                "message": "Deployment completed",
                "repo": repo_url,
                "branch": branch
            }
        except subprocess.TimeoutExpired:
            return {"status": "error", "message": "Deployment timeout"}
        except Exception as e:
            return {"status": "error", "message": str(e)}
    
    def execute_rollback(self, params: dict = None) -> dict:
        """Выполнить откат"""
        logger.info("⏪ Starting rollback...")
        
        if not os.path.exists(SITE_PATH):
            return {"status": "error", "message": "Site path not found"}
        
        try:
            os.chdir(SITE_PATH)
            
            result = subprocess.run(['git', 'rev-list', '--count', 'HEAD'], 
                                   capture_output=True, text=True, timeout=10)
            commit_count = int(result.stdout.strip()) if result.stdout.strip() else 0
            
            if commit_count <= 1:
                return {"status": "error", "message": "No previous commit to rollback to"}
            
            cmd = ['git', 'reset', '--hard', 'HEAD~1']
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            if result.returncode != 0:
                return {"status": "error", "message": f"Git reset failed: {result.stderr}"}
            
            if os.path.exists('docker-compose.yml'):
                subprocess.run(['docker', 'compose', 'down'], capture_output=True, timeout=30)
                subprocess.run(['docker', 'compose', 'up', '-d'], capture_output=True, timeout=120)
            
            return {"status": "success", "message": "Rollback completed"}
        except Exception as e:
            return {"status": "error", "message": str(e)}
    
    def execute_restart_nginx(self, params: dict = None) -> dict:
        """Перезапустить nginx"""
        logger.info("🔄 Restarting nginx...")
        
        try:
            result = subprocess.run(['systemctl', 'restart', 'nginx'],
                                   capture_output=True, text=True, timeout=30)
            if result.returncode == 0:
                return {"status": "success", "message": "Nginx restarted via systemctl"}
            
            result = subprocess.run(['docker', 'restart', 'nginx'],
                                   capture_output=True, text=True, timeout=30)
            if result.returncode == 0:
                return {"status": "success", "message": "Nginx restarted via docker"}
            
            result = subprocess.run(['nginx', '-s', 'reload'],
                                   capture_output=True, text=True, timeout=30)
            if result.returncode == 0:
                return {"status": "success", "message": "Nginx reloaded"}
            
            return {"status": "error", "message": "Failed to restart nginx"}
        except Exception as e:
            return {"status": "error", "message": str(e)}
    
    def execute_check_site(self, params: dict = None) -> dict:
        """Проверить локальный сайт"""
        url = params.get('url', 'http://localhost') if params else 'http://localhost'
        
        try:
            insecure_tls = os.getenv("ALLOW_INSECURE_TLS", "false").lower() in ("1", "true", "yes")
            start = datetime.now()
            resp = requests.get(url, timeout=10, verify=not insecure_tls)
            elapsed = (datetime.now() - start).total_seconds()
            
            return {
                "status": "success",
                "url": url,
                "status_code": resp.status_code,
                "response_time": round(elapsed, 3),
                "is_accessible": resp.status_code < 400
            }
        except Exception as e:
            return {
                "status": "error",
                "url": url,
                "is_accessible": False,
                "error": str(e)
            }
    
    async def handle_command(self, message: dict) -> dict:
        """Обработка входящей команды"""
        action = message.get('action')
        params = message.get('params', {})
        request_id = message.get('request_id', 'unknown')
        
        logger.info(f"📨 Received command: {action}")
        
        if action == 'deploy':
            result = self.execute_deploy(params)
        elif action == 'rollback':
            result = self.execute_rollback(params)
        elif action == 'restart_nginx':
            result = self.execute_restart_nginx(params)
        elif action == 'check_site':
            result = self.execute_check_site(params)
        elif action == 'get_stats':
            result = self.get_system_stats()
        elif action == 'ping':
            result = {"status": "ok", "message": "pong", "hostname": self.hostname}
        else:
            result = {"status": "error", "message": f"Unknown action: {action}"}
        
        return {
            "type": "command_response",
            "request_id": request_id,
            "action": action,
            "result": result
        }
    
    async def send_stats_loop(self, websocket):
        """Периодическая отправка метрик"""
        while self.connected:
            try:
                await asyncio.sleep(15)
                stats = self.get_system_stats()
                await websocket.send(json.dumps({
                    "type": "stats",
                    "data": stats
                }))
                logger.info(f"📊 Stats sent: CPU={stats.get('cpu_percent', 0)}%, RAM={stats.get('memory_percent', 0)}%")
            except Exception as e:
                logger.error(f"Error sending stats: {e}")
                break
    
    async def connect(self):
        """Установка WebSocket соединения"""
        if not self.token:
            logger.error("❌ AGENT_TOKEN not set!")
            return
        
        url = f"{self.api_url}/{self.token}"
        logger.info(f"🔌 Connecting to {url}")
        
        while True:
            try:
                async with websockets.connect(url, ping_interval=30, ping_timeout=10) as ws:
                    self.connected = True
                    logger.info("✅ Connected to API")
                    
                    welcome = await ws.recv()
                    welcome_data = json.loads(welcome)
                    logger.info(f"👋 {welcome_data.get('message', 'Welcome')}")
                    
                    stats_task = asyncio.create_task(self.send_stats_loop(ws))
                    
                    async for msg in ws:
                        try:
                            data = json.loads(msg)
                            
                            if data.get('type') == 'command':
                                response = await self.handle_command(data)
                                await ws.send(json.dumps(response))
                            
                        except json.JSONDecodeError:
                            logger.error(f"Invalid JSON: {msg[:100]}")
                    
                    stats_task.cancel()
                    
            except websockets.ConnectionClosed:
                logger.warning("⚠️ Connection closed, reconnecting in 5s...")
                self.connected = False
                await asyncio.sleep(5)
            except Exception as e:
                logger.error(f"❌ Connection error: {e}, reconnecting in 10s...")
                self.connected = False
                await asyncio.sleep(10)
    
    def run(self):
        """Запуск агента"""
        if not self.token:
            logger.error("❌ AGENT_TOKEN not set!")
            return
        
        asyncio.run(self.connect())


if __name__ == '__main__':
    agent = DevOpsAgent()
    agent.run()