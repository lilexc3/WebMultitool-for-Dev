# backend/app/main.py
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import sys
import os
import logging
import requests
import secrets
import json
import re

from app.database import init_database, fetch_one, fetch_all, execute, execute_returning_id

# Добавляем путь к core
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core import (
    check_site_health,
    get_site_full_stats,
    get_server_stats,
    trigger_deploy,
    trigger_rollback,
    get_site_info
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="DevOps WebApp API", version="1.0.0")


@app.on_event("startup")
def _startup():
    init_database()

# CORS для фронтенда
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Пути
PROMETHEUS_URL = os.getenv('PROMETHEUS_URL', 'http://localhost:9090')

# ============== МОДЕЛИ ДАННЫХ ==============
class SiteCheckRequest(BaseModel):
    url: str

class SiteCreateRequest(BaseModel):
    url: str
    name: str
    git_repo_url: Optional[str] = None

class SiteUpdateRequest(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    active: Optional[bool] = None

# ============== WebSocket Менеджер ==============
class ConnectionManager:
    """Менеджер WebSocket соединений"""
    
    def __init__(self):
        self.active_connections: dict = {}
    
    async def connect(self, websocket: WebSocket, token: str, site_id: int):
        await websocket.accept()
        self.active_connections[token] = {
            "websocket": websocket,
            "site_id": site_id,
            "connected_at": datetime.now(),
            "last_seen": datetime.now()
        }
        logger.info(f"Agent connected: site_id={site_id}")
    
    def disconnect(self, token: str):
        if token in self.active_connections:
            site_id = self.active_connections[token]["site_id"]
            del self.active_connections[token]
            logger.info(f"Agent disconnected: site_id={site_id}")
    
    async def send_command(self, token: str, command: dict) -> bool:
        if token not in self.active_connections:
            return False
        try:
            websocket = self.active_connections[token]["websocket"]
            await websocket.send_json(command)
            self.active_connections[token]["last_seen"] = datetime.now()
            return True
        except:
            return False
    
    async def send_command_by_site_id(self, site_id: int, command: dict) -> bool:
        for token, conn in self.active_connections.items():
            if conn["site_id"] == site_id:
                return await self.send_command(token, command)
        return False
    
    def get_online_sites(self) -> list:
        return [conn["site_id"] for conn in self.active_connections.values()]
    
    def is_site_online(self, site_id: int) -> bool:
        return site_id in self.get_online_sites()

manager = ConnectionManager()

# ============== Вспомогательные функции ==============

def validate_url(url: str) -> bool:
    """Проверяет, что URL валидный"""
    if not url.startswith(('http://', 'https://')):
        return False
    pattern = r'^https?://([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:[0-9]+)?(/.*)?$|^https?://(\d{1,3}\.){3}\d{1,3}(:[0-9]+)?(/.*)?$'
    return re.match(pattern, url) is not None

async def get_current_user(x_user_id: Optional[int] = Header(None)) -> int:
    """Временная авторизация через заголовок"""
    if x_user_id is None:
        raise HTTPException(status_code=401, detail="X-User-ID header required")
    return x_user_id

def verify_agent_token(token: str) -> dict:
    """Проверить токен агента и вернуть site_id"""
    site = fetch_one(
        """
        SELECT id, user_id, url, name, git_repo_url
        FROM sites
        WHERE agent_token = %s
        """,
        (token,),
    )

    if site:
        return {
            "site_id": int(site["id"]),
            "user_id": int(site["user_id"]),
            "url": site["url"],
            "name": site["name"],
            "git_repo_url": site.get("git_repo_url"),
        }
    return None

def get_all_sites_from_db(user_id: Optional[int] = None) -> List[dict]:
    """Получить все сайты из БД (если указан user_id — только его)"""
    if user_id is not None:
        sites = fetch_all(
            """
            SELECT id, user_id, url, name, active, created_at,
                   last_status, last_check, agent_connected, git_repo_url, agent_token
            FROM sites
            WHERE user_id = %s
            ORDER BY created_at DESC
            """,
            (user_id,),
        )
    else:
        sites = fetch_all(
            """
            SELECT id, user_id, url, name, active, created_at,
                   last_status, last_check, agent_connected, git_repo_url, agent_token
            FROM sites
            ORDER BY created_at DESC
            """
        )
    
    result = []
    for site in sites:
        result.append({
            "id": int(site["id"]),
            "user_id": int(site["user_id"]),
            "url": site["url"],
            "name": site["name"],
            "active": bool(site["active"]),
            "created_at": site["created_at"],
            "last_status": site.get("last_status"),
            "last_check": site.get("last_check"),
            "agent_connected": bool(site["agent_connected"]),
            "git_repo_url": site.get("git_repo_url"),
            "agent_token": site.get("agent_token"),
        })
    return result

def update_prometheus_targets():
    """Обновить файл targets.json для Prometheus"""
    sites = fetch_all("SELECT id, url, name FROM sites WHERE active = TRUE")
    
    targets = []
    for site in sites:
        site_id = int(site["id"])
        url = site["url"]
        name = site["name"]
        targets.append({
            "targets": [url],
            "labels": {
                "job": "blackbox-http",
                "site_id": str(site_id),
                "site_name": name,
                "instance": url
            }
        })
    
    targets_path = os.getenv(
        "PROMETHEUS_FILE_SD_TARGETS",
        "/shared/prometheus_file_sd/targets.json",
    )
    os.makedirs(os.path.dirname(targets_path), exist_ok=True)
    
    with open(targets_path, 'w') as f:
        json.dump(targets, f, indent=2)
    
    logger.info(f"Updated Prometheus targets: {len(targets)} sites")
    
    try:
        requests.post(f"{PROMETHEUS_URL}/-/reload", timeout=5)
        logger.info("Prometheus reloaded")
    except Exception as e:
        logger.error(f"Failed to reload Prometheus: {e}")

# ============== API ЭНДПОИНТЫ ==============

@app.get("/")
async def root():
    return {"message": "DevOps WebApp API", "version": "1.0.0", "docs": "/docs"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.get("/api/server/stats")
async def server_stats():
    """Получить статистику сервера (CPU, RAM, Disk, Load)"""
    stats = get_server_stats()
    return {"status": "ok", "data": stats}

# ============== САЙТЫ - ФИКСИРОВАННЫЕ ПУТИ ==============

@app.get("/api/sites/online")
async def get_online_sites():
    """Получить список сайтов с активными агентами"""
    return {"status": "ok", "online_sites": manager.get_online_sites()}

@app.post("/api/sites/check")
async def check_site(req: SiteCheckRequest):
    """Проверить доступность сайта по URL"""
    result = check_site_health(req.url)
    return {
        "url": req.url,
        "is_accessible": result.get("is_accessible", False),
        "status_code": result.get("status_code", 0),
        "response_time": result.get("response_time", 0),
        "error": result.get("error")
    }

# ============== САЙТЫ - CRUD ==============

@app.get("/api/sites")
async def get_sites(user_id: int = Depends(get_current_user)):
    """Получить список сайтов текущего пользователя"""
    sites = get_all_sites_from_db(user_id)
    return {"status": "ok", "data": sites, "count": len(sites)}

@app.post("/api/sites")
async def create_site(req: SiteCreateRequest, user_id: int = Depends(get_current_user)):
    """Создать новый сайт"""
    # Валидация URL
    if not validate_url(req.url):
        raise HTTPException(status_code=400, detail="Invalid URL format. Must start with http:// or https://")
    
    agent_token = secrets.token_urlsafe(32)

    try:
        site_id = execute_returning_id(
            """
            INSERT INTO sites (user_id, url, name, git_repo_url, agent_token)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id
            """,
            (user_id, req.url, req.name, req.git_repo_url, agent_token),
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to create site (possible duplicate)")
    
    update_prometheus_targets()
    
    agent_command = f"docker run -d --restart always --name devops-agent -e AGENT_TOKEN={agent_token} -e API_URL=ws://your-server:8000/ws/agent -v /var/run/docker.sock:/var/run/docker.sock lilexc3/webmultitool-agent:latest"
    
    return {
        "status": "ok",
        "site_id": site_id,
        "agent_token": agent_token,
        "agent_command": agent_command,
        "message": "Site created. Run the agent command on your server to connect."
    }

# ============== САЙТЫ - С ПАРАМЕТРОМ ==============

@app.get("/api/sites/{site_id}")
async def get_site(site_id: int, user_id: int = Depends(get_current_user)):
    """Получить информацию о конкретном сайте"""
    site = get_site_info(site_id)
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    
    # Проверка владельца
    if site.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    site["agent_online"] = manager.is_site_online(site_id)
    
    return {"status": "ok", "data": site}

@app.put("/api/sites/{site_id}")
async def update_site(site_id: int, req: SiteUpdateRequest, user_id: int = Depends(get_current_user)):
    """Обновить информацию о сайте"""
    site = get_site_info(site_id)
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    
    if site.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    updates = []
    params = []
    
    if req.name is not None:
        updates.append("name = %s")
        params.append(req.name)
    if req.url is not None:
        if not validate_url(req.url):
            raise HTTPException(status_code=400, detail="Invalid URL format")
        updates.append("url = %s")
        params.append(req.url)
    if req.active is not None:
        updates.append("active = %s")
        params.append(bool(req.active))
    
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    params.append(site_id)
    query = f"UPDATE sites SET {', '.join(updates)} WHERE id = %s"
    execute(query, tuple(params))
    
    update_prometheus_targets()
    
    return {"status": "ok", "message": "Site updated"}

@app.delete("/api/sites/{site_id}")
async def delete_site(site_id: int, user_id: int = Depends(get_current_user)):
    """Удалить сайт"""
    site = get_site_info(site_id)
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    
    if site.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    execute("DELETE FROM sites WHERE id = %s", (site_id,))
    
    update_prometheus_targets()
    
    return {"status": "ok", "message": "Site deleted"}

@app.post("/api/sites/{site_id}/check")
async def check_site_by_id(site_id: int, user_id: int = Depends(get_current_user)):
    """Проверить доступность сайта по ID"""
    site = get_site_info(site_id)
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    
    if site.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    result = check_site_health(site["url"])
    
    execute(
        """
        UPDATE sites
        SET last_status = %s, last_check = now()
        WHERE id = %s
        """,
        (result.get("status_code", 0), site_id),
    )
    
    return {
        "site_id": site_id,
        "url": site["url"],
        "is_accessible": result.get("is_accessible", False),
        "status_code": result.get("status_code", 0),
        "response_time": result.get("response_time", 0),
        "error": result.get("error")
    }

@app.post("/api/sites/{site_id}/full-stats")
async def get_full_stats(site_id: int, user_id: int = Depends(get_current_user)):
    """Получить полную статистику сайта (HTTP, Ping, DNS, SSL)"""
    site = get_site_info(site_id)
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    
    if site.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    stats = get_site_full_stats(site["url"])
    return {"status": "ok", "data": stats}

@app.post("/api/sites/{site_id}/deploy")
async def deploy_site(site_id: int, user_id: int = Depends(get_current_user)):
    """Запустить деплой (через агента или GitLab API)"""
    site = get_site_info(site_id)
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    
    if site.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if manager.is_site_online(site_id):
        command = {
            "type": "command",
            "action": "deploy",
            "request_id": f"deploy_{site_id}_{datetime.now().timestamp()}",
            "params": {
                "repo_url": site.get("git_repo_url", ""),
                "branch": "main"
            }
        }
        success = await manager.send_command_by_site_id(site_id, command)
        if success:
            return {"status": "sent", "message": "Deploy command sent to agent", "via": "agent"}
        else:
            return {"status": "error", "message": "Failed to send command to agent"}
    else:
        result = trigger_deploy(site_id)
        result["via"] = "gitlab"
        return result

@app.post("/api/sites/{site_id}/rollback")
async def rollback_site(site_id: int, user_id: int = Depends(get_current_user)):
    """Запустить откат (через агента или GitLab API)"""
    site = get_site_info(site_id)
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    
    if site.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if manager.is_site_online(site_id):
        command = {
            "type": "command",
            "action": "rollback",
            "request_id": f"rollback_{site_id}_{datetime.now().timestamp()}",
            "params": {}
        }
        success = await manager.send_command_by_site_id(site_id, command)
        if success:
            return {"status": "sent", "message": "Rollback command sent to agent", "via": "agent"}
        else:
            return {"status": "error", "message": "Failed to send command to agent"}
    else:
        result = trigger_rollback(site_id)
        result["via"] = "gitlab"
        return result

@app.get("/api/sites/{site_id}/metrics")
async def get_site_metrics(site_id: int, user_id: int = Depends(get_current_user)):
    """Получить метрики сайта из Prometheus"""
    site = get_site_info(site_id)
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    
    if site.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    url = site["url"]
    
    status_query = f'probe_success{{instance="{url}"}}'
    is_up = False
    
    try:
        status_resp = requests.get(f"{PROMETHEUS_URL}/api/v1/query", params={'query': status_query}, timeout=5)
        if status_resp.status_code == 200:
            data = status_resp.json()
            if data['data']['result']:
                is_up = float(data['data']['result'][0]['value'][1]) == 1
    except Exception as e:
        logger.error(f"Prometheus error: {e}")
    
    uptime_query = f'avg_over_time(probe_success{{instance="{url}"}}[24h]) * 100'
    uptime = 0.0
    
    try:
        uptime_resp = requests.get(f"{PROMETHEUS_URL}/api/v1/query", params={'query': uptime_query}, timeout=5)
        if uptime_resp.status_code == 200:
            data = uptime_resp.json()
            if data['data']['result']:
                uptime = float(data['data']['result'][0]['value'][1])
    except Exception as e:
        logger.error(f"Prometheus error: {e}")
    
    return {
        "site_id": site_id,
        "url": url,
        "is_up": is_up,
        "uptime_24h": round(uptime, 2)
    }

# ============== WEBSOCKET ДЛЯ АГЕНТОВ ==============

@app.websocket("/ws/agent/{token}")
async def websocket_agent_endpoint(websocket: WebSocket, token: str):
    """WebSocket эндпоинт для подключения агентов"""
    
    site_info = verify_agent_token(token)
    if not site_info:
        await websocket.close(code=4001, reason="Invalid token")
        return
    
    site_id = site_info["site_id"]
    
    await manager.connect(websocket, token, site_id)

    execute("UPDATE sites SET agent_connected = TRUE WHERE id = %s", (site_id,))
    
    try:
        await websocket.send_json({
            "type": "welcome",
            "message": "Connected to DevOps WebApp",
            "site_id": site_id,
            "site_name": site_info["name"]
        })
        
        while True:
            message = await websocket.receive_json()
            msg_type = message.get("type", "")
            
            if msg_type == "stats":
                data = message.get("data", {})
                logger.info(f"Stats from site {site_id}: CPU={data.get('cpu_percent', 0)}%, RAM={data.get('memory_percent', 0)}%")
            elif msg_type == "command_response":
                result = message.get("result", {})
                logger.info(f"Command response from site {site_id}: {result}")
            elif msg_type == "alert":
                alert_data = message.get("data", {})
                logger.warning(f"Alert from site {site_id}: {alert_data}")
    
    except WebSocketDisconnect:
        logger.info(f"Agent disconnected: site_id={site_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        manager.disconnect(token)
        execute("UPDATE sites SET agent_connected = FALSE WHERE id = %s", (site_id,))

# ============== ЗАПУСК ==============
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)