# backend/app/main.py
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
load_dotenv()
from typing import Optional, List
from datetime import datetime
from jose import jwt
import bcrypt
import secrets as crypto_secrets
import sys
import os
import logging
import requests
import secrets
import json
import re
from app.websocket import manager

from app.database import init_database, fetch_one, fetch_all, execute, execute_returning_id

# Добавляем путь к core
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models import (
    UserRegisterRequest,
    UserLoginRequest,
    UserUpdateRequest,
    PasswordChangeRequest,
    TokenResponse,
    SiteCreateRequest,
    SiteUpdateRequest,
    SiteCheckRequest,
    NodeCreateRequest,
    ServiceCreateRequest
)

from core import (
    check_site_health,
    get_site_full_stats,
    get_server_stats,
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

# Безопасность
SECRET_KEY = os.getenv('SECRET_KEY', crypto_secrets.token_urlsafe(32))
ALGORITHM = "HS256"

# Пути
PROMETHEUS_URL = os.getenv('PROMETHEUS_URL', 'http://localhost:9090')

# ============== Вспомогательные функции ==============

def hash_password(password: str) -> str:
    """Хеширование пароля через bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Проверка пароля через bcrypt"""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_access_token(user_id: int) -> str:
    to_encode = {"user_id": user_id}
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_user_from_token(token: str) -> Optional[int]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("user_id")
    except:
        return None

def validate_url(url: str) -> bool:
    """Проверяет, что URL валидный"""
    if not url.startswith(('http://', 'https://')):
        return False
    pattern = r'^https?://([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:[0-9]+)?(/.*)?$|^https?://(\d{1,3}\.){3}\d{1,3}(:[0-9]+)?(/.*)?$'
    return re.match(pattern, url) is not None

async def get_current_user(
    x_user_id: Optional[int] = Header(None),
    authorization: Optional[str] = Header(None)
) -> int:
    """Авторизация через JWT токен или X-User-ID (для обратной совместимости)"""
    # Пробуем JWT токен
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]
        user_id = get_user_from_token(token)
        if user_id:
            return user_id
    
    # Fallback на X-User-ID
    if x_user_id is not None:
        return x_user_id
    
    raise HTTPException(status_code=401, detail="Authentication required")

def verify_agent_token(token: str) -> dict:
    """Проверить токен агента и вернуть site_id (ищет только в site_nodes)"""
    node = fetch_one(
        """SELECT sn.id, sn.site_id, sn.name, s.url, s.user_id
           FROM site_nodes sn JOIN sites s ON sn.site_id = s.id
           WHERE sn.agent_token = %s""",
        (token,)
    )
    if node:
        return {
            "site_id": node["site_id"],
            "user_id": node["user_id"],
            "url": node["url"],
            "name": node["name"],
            "node_id": node["id"]
        }
    return None

def get_all_sites_from_db(user_id: Optional[int] = None) -> List[dict]:
    """Получить все сайты из БД (если указан user_id — только его)"""
    if user_id is not None:
        sites = fetch_all(
            """
            SELECT id, user_id, url, name, active, created_at,
                   last_status, last_check, git_repo_url, dashboard_mode, custom_dashboard_url
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
                   last_status, last_check, git_repo_url
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
            "git_repo_url": site.get("git_repo_url"),
            "dashboard_mode": site.get("dashboard_mode", "standard"),
            "custom_dashboard_url": site.get("custom_dashboard_url"),
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

def log_deploy(site_id: int, user_id: int, action: str, node_name: str = None, services_count: int = 0, status: str = "success", error_message: str = None):
    execute(
        "INSERT INTO activity_logs (site_id, user_id, action, node_name, services_count, status, error_message) VALUES (%s, %s, %s, %s, %s, %s, %s)",
        (site_id, user_id, action, node_name, services_count, status, error_message)
    )
# ============== API ЭНДПОИНТЫ ==============

@app.post("/api/auth/register")
async def register_user(req: UserRegisterRequest):
    """Регистрация нового пользователя"""
    # Проверяем, что email не занят
    existing = fetch_one("SELECT id FROM users WHERE email = %s", (req.email,))
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    password_hash = hash_password(req.password)
    
    user_id = execute_returning_id(
        """
        INSERT INTO users (email, password_hash, name)
        VALUES (%s, %s, %s)
        RETURNING id
        """,
        (req.email, password_hash, req.name),
    )
    
    token = create_access_token(user_id)
    
    return {
        "status": "ok",
        "user_id": user_id,
        "access_token": token,
        "token_type": "bearer",
        "message": "User registered successfully"
    }

@app.post("/api/auth/login")
async def login_user(req: UserLoginRequest):
    """Вход пользователя"""
    user = fetch_one("SELECT id, password_hash FROM users WHERE email = %s", (req.email,))
    
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    user_id = int(user["id"])
    token = create_access_token(user_id)
    
    return {
        "status": "ok",
        "user_id": user_id,
        "access_token": token,
        "token_type": "bearer",
        "message": "Login successful"
    }

@app.get("/api/users/me")
async def get_current_user_profile(user_id: int = Depends(get_current_user)):
    user = fetch_one(
        "SELECT id, email, name, created_at FROM users WHERE id = %s",
        (user_id,),
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    sites = fetch_all("SELECT id, deploys_count FROM sites WHERE user_id = %s", (user_id,))

    uptime_vals = []
    for site in sites:
        url_row = fetch_one("SELECT url FROM sites WHERE id = %s", (site["id"],))
        if url_row:
            q = f'avg_over_time(probe_success{{instance="{url_row["url"]}"}}[30d]) * 100'
            try:
                resp = requests.get(f"{PROMETHEUS_URL}/api/v1/query", params={"query": q}, timeout=3)
                if resp.status_code == 200:
                    data = resp.json()
                    if data["data"]["result"]:
                        uptime_vals.append(float(data["data"]["result"][0]["value"][1]))
            except Exception:
                pass

    avg_uptime = round(sum(uptime_vals) / len(uptime_vals), 2) if uptime_vals else None

    return {
        "status": "ok",
        "data": {
            "id": int(user["id"]),
            "email": user["email"],
            "name": user.get("name"),
            "created_at": user["created_at"].isoformat() if user["created_at"] else None,
            "total_sites": len(sites),
            "avg_uptime_30d": avg_uptime,
        }
    }

@app.put("/api/users/me")
async def update_current_user_profile(req: UserUpdateRequest, user_id: int = Depends(get_current_user)):
    updates, params = [], []
    if req.name is not None:
        updates.append("name = %s")
        params.append(req.name)
    if req.email is not None:
        existing = fetch_one("SELECT id FROM users WHERE email = %s AND id != %s", (req.email, user_id))
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")
        updates.append("email = %s")
        params.append(req.email)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    params.append(user_id)
    execute(f"UPDATE users SET {', '.join(updates)} WHERE id = %s", tuple(params))
    return {"status": "ok", "message": "Profile updated"}

@app.put("/api/users/me/password")
async def change_password(req: PasswordChangeRequest, user_id: int = Depends(get_current_user)):
    user = fetch_one("SELECT password_hash FROM users WHERE id = %s", (user_id,))
    if not user or not verify_password(req.current_password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    execute("UPDATE users SET password_hash = %s WHERE id = %s", (hash_password(req.new_password), user_id))
    return {"status": "ok", "message": "Password changed"}

@app.delete("/api/users/me")
async def delete_current_user(user_id: int = Depends(get_current_user)):
    execute("DELETE FROM sites WHERE user_id = %s", (user_id,))
    execute("DELETE FROM users WHERE id = %s", (user_id,))
    return {"status": "ok", "message": "Account deleted"}

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

# ============== Ноды и сервисы внутри нод ==============

@app.get("/api/sites/{site_id}/nodes")
async def get_nodes(site_id: int, user_id: int = Depends(get_current_user)):
    site = get_site_info(site_id)
    if not site or site.get("user_id") != user_id:
        raise HTTPException(status_code=403)
    
    nodes = fetch_all("SELECT * FROM site_nodes WHERE site_id = %s", (site_id,))
    return {"status": "ok", "data": nodes}

@app.post("/api/sites/{site_id}/nodes")
async def create_node(site_id: int, req: NodeCreateRequest, user_id: int = Depends(get_current_user)):
    site = get_site_info(site_id)
    if not site or site.get("user_id") != user_id:
        raise HTTPException(status_code=403)
    
    agent_token = secrets.token_urlsafe(32)
    node_id = execute_returning_id(
        "INSERT INTO site_nodes (site_id, name, vps_ip, agent_token) VALUES (%s, %s, %s, %s) RETURNING id",
        (site_id, req.name, req.vps_ip, agent_token)
    )
    
    log_deploy(site_id, user_id, "node_added", req.name, 0, "success")
    
    api_url = os.getenv("API_PUBLIC_URL", "http://localhost:8000")
    
    return {
        "status": "ok",
        "node_id": node_id,
        "agent_token": agent_token,
        "setup_command": f"curl -sSL {api_url}/api/agent/install.sh | bash -s {agent_token}"
    }

@app.delete("/api/sites/{site_id}/nodes/{node_id}")
async def delete_node(site_id: int, node_id: int, user_id: int = Depends(get_current_user)):
    node = fetch_one("SELECT name FROM site_nodes WHERE id = %s", (node_id,))
    execute("DELETE FROM site_nodes WHERE id = %s AND site_id = %s", (node_id, site_id))
    
    if node:
        log_deploy(site_id, user_id, "node_removed", node["name"], 0, "success")
    
    return {"status": "ok"}

@app.get("/api/sites/{site_id}/nodes/{node_id}/services")
async def get_services(site_id: int, node_id: int, user_id: int = Depends(get_current_user)):
    services = fetch_all("SELECT * FROM node_services WHERE node_id = %s", (node_id,))
    return {"status": "ok", "data": services}

@app.post("/api/sites/{site_id}/nodes/{node_id}/services")
async def create_service(site_id: int, node_id: int, req: ServiceCreateRequest, user_id: int = Depends(get_current_user)):
    service_id = execute_returning_id(
        "INSERT INTO node_services (node_id, name, repo_url, deploy_path, build_command, restart_command, docker_compose) VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id",
        (node_id, req.name, req.repo_url, req.deploy_path, req.build_command, req.restart_command, req.docker_compose)
    )
    
    log_deploy(site_id, user_id, "service_added", req.name, 0, "success")
    
    return {"status": "ok", "service_id": service_id}

@app.put("/api/sites/{site_id}/nodes/{node_id}/services/{service_id}")
async def update_service(site_id: int, node_id: int, service_id: int, req: ServiceCreateRequest, user_id: int = Depends(get_current_user)):
    site = get_site_info(site_id)
    if not site or site.get("user_id") != user_id:
        raise HTTPException(status_code=403)

    updates = []
    params = []

    if req.name is not None:
        updates.append("name = %s")
        params.append(req.name)
    if req.repo_url is not None:
        updates.append("repo_url = %s")
        params.append(req.repo_url)
    if req.deploy_path is not None:
        updates.append("deploy_path = %s")
        params.append(req.deploy_path)
    if req.build_command is not None:
        updates.append("build_command = %s")
        params.append(req.build_command)
    if req.restart_command is not None:
        updates.append("restart_command = %s")
        params.append(req.restart_command)
    if req.docker_compose is not None:
        updates.append("docker_compose = %s")
        params.append(req.docker_compose)

    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    params.append(service_id)
    query = f"UPDATE node_services SET {', '.join(updates)} WHERE id = %s"
    execute(query, tuple(params))

    log_deploy(site_id, user_id, "service_updated", req.name or "service", 0, "success")

    return {"status": "ok", "message": "Service updated"}

@app.delete("/api/sites/{site_id}/nodes/{node_id}/services/{service_id}")
async def delete_service(site_id: int, node_id: int, service_id: int, user_id: int = Depends(get_current_user)):
    service = fetch_one("SELECT name FROM node_services WHERE id = %s", (service_id,))
    execute("DELETE FROM node_services WHERE id = %s AND node_id = %s", (service_id, node_id))
    
    if service:
        log_deploy(site_id, user_id, "service_removed", service["name"], 0, "success")
    
    return {"status": "ok"}

@app.post("/api/sites/{site_id}/nodes/{node_id}/services/{service_id}/restart")
async def restart_service(site_id: int, node_id: int, service_id: int, user_id: int = Depends(get_current_user)):
    site = get_site_info(site_id)
    if not site or site.get("user_id") != user_id:
        raise HTTPException(status_code=403)

    service = fetch_one("SELECT name, restart_command FROM node_services WHERE id = %s", (service_id,))
    if not service or not service.get("restart_command"):
        raise HTTPException(status_code=400, detail="No restart command configured for this service")

    node = fetch_one("SELECT name, agent_token FROM site_nodes WHERE id = %s", (node_id,))
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")

    token = node["agent_token"]
    if token not in [c.get("token") for c in manager.active_connections.values()]:
        raise HTTPException(status_code=400, detail="Agent offline")

    command = {
        "type": "command",
        "action": "restart_service",
        "request_id": f"restart_{service_id}_{datetime.now().timestamp()}",
        "params": {
            "services": [
                {
                    "name": service["name"],
                    "restart_command": service["restart_command"]
                }
            ]
        }
    }
    await manager.send_command(token, command)
    
    log_deploy(site_id, user_id, "service_restarted", node["name"], 0, "success")

    return {"status": "ok", "message": f"Service {service['name']} restart command sent"}

@app.get("/api/sites/{site_id}/nodes/summary")
async def get_nodes_summary(site_id: int, user_id: int = Depends(get_current_user)):
    """Сводка по всем нодам (CPU, RAM)"""
    site = get_site_info(site_id)
    if not site or site.get("user_id") != user_id:
        raise HTTPException(status_code=403)
    
    nodes = fetch_all("SELECT id, name, vps_ip, agent_connected FROM site_nodes WHERE site_id = %s", (site_id,))
    
    summary = []
    for node in nodes:
        summary.append({
            "id": node["id"],
            "name": node["name"],
            "vps_ip": node.get("vps_ip"),
            "agent_online": node["agent_connected"]
        })
    
    return {"status": "ok", "data": summary}

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
    """Создать новый сайт с автоматической нодой"""
    if not validate_url(req.url):
        raise HTTPException(status_code=400, detail="Invalid URL format. Must start with http:// or https://")
    
    try:
        site_id = execute_returning_id(
            """
            INSERT INTO sites (user_id, url, name, git_repo_url)
            VALUES (%s, %s, %s, %s)
            RETURNING id
            """,
            (user_id, req.url, req.name, req.git_repo_url),
        )
    except Exception as e:
        logger.error(f"Failed to create site: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to create site: {str(e)}")
    
    update_prometheus_targets()
    
    return {
    "status": "ok",
    "site_id": site_id,
    "message": "Site created. Add nodes to configure deployment."
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
    if req.dashboard_mode is not None:
        updates.append("dashboard_mode = %s")
        params.append(req.dashboard_mode)
    if req.custom_dashboard_url is not None:
        updates.append("custom_dashboard_url = %s")
        params.append(req.custom_dashboard_url)
    
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
    """Деплой на все ноды сайта (с сервисами)"""
    site = get_site_info(site_id)
    if not site or site.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    nodes = fetch_all("SELECT id, name, agent_token FROM site_nodes WHERE site_id = %s", (site_id,))
    
    if not nodes:
        return {"status": "error", "message": "No nodes configured. Add a node first."}
    
    results = []
    for node in nodes:
        services = fetch_all(
            "SELECT * FROM node_services WHERE node_id = %s AND repo_url IS NOT NULL",
            (node["id"],)
        )
        
        if not services:
            results.append({"node": node["name"], "status": "skipped", "reason": "No services with repository"})
            log_deploy(site_id, user_id, "deploy", node["name"], 0, "skipped", "No services with repository")
            continue
        
        token = node["agent_token"]
        if token not in [c.get("token") for c in manager.active_connections.values()]:
            results.append({"node": node["name"], "status": "offline"})
            log_deploy(site_id, user_id, "deploy", node["name"], 0, "failed", "Agent offline")
            continue
        
        command = {
            "type": "command",
            "action": "deploy",
            "request_id": f"deploy_{node['id']}_{datetime.now().timestamp()}",
            "params": {
                "services": [
                    {
                        "name": s["name"],
                        "repo_url": s["repo_url"],
                        "deploy_path": s["deploy_path"],
                        "build_command": s["build_command"],
                        "docker_compose": s["docker_compose"]
                    }
                    for s in services
                ]
            }
        }
        await manager.send_command(token, command)
        results.append({"node": node["name"], "status": "deployed", "services": len(services)})
        log_deploy(site_id, user_id, "deploy", node["name"], len(services), "success")
    
    return {"status": "ok", "message": f"Deployed to {sum(1 for r in results if r['status'] == 'deployed')}/{len(nodes)} nodes", "results": results}

@app.post("/api/sites/{site_id}/rollback")
async def rollback_site(site_id: int, user_id: int = Depends(get_current_user)):
    """Откат на всех нодах сайта"""
    site = get_site_info(site_id)
    if not site or site.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    nodes = fetch_all("SELECT id, name, agent_token FROM site_nodes WHERE site_id = %s", (site_id,))
    
    if not nodes:
        return {"status": "error", "message": "No nodes configured. Add a node first."}
    
    results = []
    for node in nodes:
        services = fetch_all("SELECT * FROM node_services WHERE node_id = %s AND repo_url IS NOT NULL", (node["id"],))
        
        if not services:
            results.append({"node": node["name"], "status": "skipped"})
            log_deploy(site_id, user_id, "rollback", node["name"], 0, "skipped", "No services")
            continue
        
        token = node["agent_token"]
        if token not in [c.get("token") for c in manager.active_connections.values()]:
            results.append({"node": node["name"], "status": "offline"})
            log_deploy(site_id, user_id, "rollback", node["name"], 0, "failed", "Agent offline")
            continue
        
        command = {
            "type": "command",
            "action": "rollback",
            "request_id": f"rollback_{node['id']}_{datetime.now().timestamp()}",
            "params": {
                "services": [
                    {"name": s["name"], "repo_url": s["repo_url"], "deploy_path": s["deploy_path"], "build_command": s["build_command"]}
                    for s in services
                ]
            }
        }
        await manager.send_command(token, command)
        results.append({"node": node["name"], "status": "rolled_back"})
        log_deploy(site_id, user_id, "rollback", node["name"], len(services), "success")
    
    return {"status": "ok", "message": f"Rolled back {sum(1 for r in results if r['status'] == 'rolled_back')}/{len(nodes)} nodes", "results": results}

@app.post("/api/sites/{site_id}/restart")
async def restart_site(site_id: int, user_id: int = Depends(get_current_user)):
    """Перезапуск всех сервисов на всех нодах сайта"""
    site = get_site_info(site_id)
    if not site or site.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    nodes = fetch_all("SELECT id, name, agent_token FROM site_nodes WHERE site_id = %s", (site_id,))
    
    if not nodes:
        return {"status": "error", "message": "No nodes configured. Add a node first."}
    
    results = []
    for node in nodes:
        services = fetch_all(
            "SELECT * FROM node_services WHERE node_id = %s AND restart_command IS NOT NULL",
            (node["id"],)
        )
        
        if not services:
            results.append({"node": node["name"], "status": "skipped", "reason": "No services with restart command"})
            log_deploy(site_id, user_id, "restart_all", node["name"], 0, "skipped", "No services with restart command")
            continue
        
        token = node["agent_token"]
        if token not in [c.get("token") for c in manager.active_connections.values()]:
            results.append({"node": node["name"], "status": "offline"})
            log_deploy(site_id, user_id, "restart_all", node["name"], 0, "failed", "Agent offline")
            continue
        
        command = {
            "type": "command",
            "action": "restart_service",
            "request_id": f"restart_{node['id']}_{datetime.now().timestamp()}",
            "params": {
                "services": [
                    {
                        "name": s["name"],
                        "restart_command": s["restart_command"]
                    }
                    for s in services
                ]
            }
        }
        await manager.send_command(token, command)
        results.append({"node": node["name"], "status": "restarted", "services": len(services)})
        log_deploy(site_id, user_id, "restart_all", node["name"], len(services), "success")
    
    return {"status": "ok", "message": f"Restarted services on {sum(1 for r in results if r['status'] == 'restarted')}/{len(nodes)} nodes", "results": results}

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

@app.get("/api/sites/{site_id}/activity")
async def get_deploy_history(site_id: int, limit: int = 30, user_id: int = Depends(get_current_user)):
    site = get_site_info(site_id)
    if not site or site.get("user_id") != user_id:
        raise HTTPException(status_code=403)
    
    logs = fetch_all(
        "SELECT id, action, node_name, services_count, status, error_message, created_at FROM activity_logs WHERE site_id = %s ORDER BY created_at DESC LIMIT %s",
        (site_id, limit)
    )
    return {"status": "ok", "data": logs}

@app.post("/api/sites/{site_id}/grafana-access")
async def get_grafana_access(site_id: int, user_id: int = Depends(get_current_user)):
    site = get_site_info(site_id)
    if not site or site.get("user_id") != user_id:
        raise HTTPException(status_code=403)

    try:
        grafana_resp = requests.post(
            "http://grafana:3000/api/auth/keys",
            json={
                "name": f"user-{user_id}-site-{site_id}",
                "role": "Editor",
                "secondsToLive": 86400
            },
            auth=("admin", "admin"),
            timeout=10
        )
        
        if grafana_resp.status_code == 200:
            api_key = grafana_resp.json().get("key")
            return {
                "status": "ok",
                "grafana_url": f"http://localhost:3100/?auth_token={api_key}"
            }
    except Exception as e:
        logger.error(f"Grafana API error: {e}")
    
    raise HTTPException(status_code=500, detail="Failed to create Grafana access")

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

    execute("UPDATE site_nodes SET agent_connected = TRUE WHERE agent_token = %s", (token,))    
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
        execute("UPDATE site_nodes SET agent_connected = FALSE WHERE agent_token = %s", (token,))

@app.get("/api/agent/agent.py")
async def get_agent_file():
    """Отдаёт актуальный файл агента"""
    agent_path = os.path.join(os.path.dirname(__file__), "..", "agent.py")
    
    if not os.path.exists(agent_path):
        raise HTTPException(status_code=404, detail="Agent file not found")
    
    with open(agent_path, "r") as f:
        content = f.read()
    
    from fastapi.responses import Response
    return Response(content=content, media_type="text/plain")
# ============== ЭНДПОИНТЫ ДЛЯ УСТАНОВКИ АГЕНТА ==============

@app.get("/api/agent/install.sh")
async def get_install_script():
    """Отдаёт скрипт установки агента"""
    api_url = os.getenv("API_PUBLIC_URL", "http://localhost:8000")
    
    script = f"""#!/bin/bash
set -e

TOKEN=$1
API_URL="{api_url}"

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
"""
    
    from fastapi.responses import Response
    return Response(content=script, media_type="text/plain")

# ============== ЗАПУСК ==============
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)