# backend/core/deploy.py
"""
Функции деплоя и отката (логика из bot.py)
"""
import os
import sys
import requests
from app.database import fetch_one

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

GITLAB_URL = os.getenv('GITLAB_URL', 'http://192.168.0.107:8929')
GITLAB_TOKEN = os.getenv('GITLAB_TOKEN', '')
GITLAB_PROJECT_ID = os.getenv('GITLAB_PROJECT_ID', '2')

def trigger_deploy(site_id: int) -> dict:
    """Запуск деплоя через GitLab API"""
    if not GITLAB_TOKEN:
        return {"status": "error", "message": "GitLab token not configured"}
    
    url = f"{GITLAB_URL}/api/v4/projects/{GITLAB_PROJECT_ID}/pipeline"
    headers = {"PRIVATE-TOKEN": GITLAB_TOKEN}
    data = {"ref": "main", "variables": [{"key": "ACTION", "value": "deploy"}]}
    
    try:
        resp = requests.post(url, json=data, headers=headers, timeout=10)
        if resp.status_code in [200, 201]:
            pipeline_url = resp.json().get('web_url', '')
            return {
                "status": "success",
                "message": "Deployment started",
                "pipeline_url": pipeline_url
            }
        else:
            return {"status": "error", "message": resp.text}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def trigger_rollback(site_id: int) -> dict:
    """Запуск отката через GitLab API"""
    if not GITLAB_TOKEN:
        return {"status": "error", "message": "GitLab token not configured"}
    
    url = f"{GITLAB_URL}/api/v4/projects/{GITLAB_PROJECT_ID}/pipeline"
    headers = {"PRIVATE-TOKEN": GITLAB_TOKEN}
    data = {"ref": "main", "variables": [{"key": "ACTION", "value": "rollback"}]}
    
    try:
        resp = requests.post(url, json=data, headers=headers, timeout=10)
        if resp.status_code in [200, 201]:
            pipeline_url = resp.json().get('web_url', '')
            return {
                "status": "success",
                "message": "Rollback started",
                "pipeline_url": pipeline_url
            }
        else:
            return {"status": "error", "message": resp.text}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def get_site_info(site_id: int) -> dict:
    """Получить информацию о сайте по ID"""
    site = fetch_one(
        """
        SELECT id, user_id, url, name, active, git_repo_url, agent_token
        FROM sites
        WHERE id = %s
        """,
        (site_id,),
    )

    if site:
        return {
            "id": int(site["id"]),
            "user_id": int(site["user_id"]),
            "url": site["url"],
            "name": site["name"],
            "active": bool(site["active"]),
            "git_repo_url": site.get("git_repo_url"),
            "agent_token": site.get("agent_token"),
        }
    return None