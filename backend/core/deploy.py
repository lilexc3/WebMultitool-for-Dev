# backend/core/deploy.py
"""
Функции для работы с сайтами
"""
import os
import sys
from app.database import fetch_one

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))


def get_site_info(site_id: int) -> dict:
    """Получить информацию о сайте по ID"""
    site = fetch_one(
        """
        SELECT id, user_id, url, name, active, git_repo_url,
               server_dashboard_mode, server_dashboard_url,
               site_dashboard_mode, site_dashboard_url
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
            "server_dashboard_mode": site.get("server_dashboard_mode", "standard"),
            "server_dashboard_url": site.get("server_dashboard_url"),
            "site_dashboard_mode": site.get("site_dashboard_mode", "standard"),
            "site_dashboard_url": site.get("site_dashboard_url"),
        }
    return None