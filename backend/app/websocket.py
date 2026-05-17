# backend/app/websocket.py
"""
Менеджер WebSocket соединений для агентов
"""
from typing import Dict
from fastapi import WebSocket
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ConnectionManager:
    """Менеджер WebSocket соединений"""
    
    def __init__(self):
        # token -> {"websocket": ws, "site_id": id, "token": token, "connected_at": datetime, "last_seen": datetime}
        self.active_connections: Dict[str, dict] = {}
    
    async def connect(self, websocket: WebSocket, token: str, site_id: int):
        """Принять новое соединение"""
        await websocket.accept()
        self.active_connections[token] = {
            "websocket": websocket,
            "site_id": site_id,
            "token": token,
            "connected_at": datetime.now(),
            "last_seen": datetime.now()
        }
        logger.info(f"Agent connected: site_id={site_id}")
    
    def disconnect(self, token: str):
        """Закрыть соединение"""
        if token in self.active_connections:
            site_id = self.active_connections[token]["site_id"]
            del self.active_connections[token]
            logger.info(f"Agent disconnected: site_id={site_id}")
    
    async def send_command(self, token: str, command: dict) -> bool:
        """Отправить команду агенту по токену"""
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
        """Отправить команду всем агентам сайта"""
        for token, conn in self.active_connections.items():
            if conn["site_id"] == site_id:
                return await self.send_command(token, command)
        return False
    
    def get_online_sites(self) -> list:
        """Список site_id с активными агентами"""
        return [conn["site_id"] for conn in self.active_connections.values()]
    
    def is_site_online(self, site_id: int) -> bool:
        """Проверить, есть ли активные агенты у сайта"""
        return site_id in self.get_online_sites()


# Глобальный экземпляр менеджера
manager = ConnectionManager()