# backend/app/websocket.py
import json
import asyncio
from typing import Dict
from fastapi import WebSocket, WebSocketDisconnect
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ConnectionManager:
    """Менеджер WebSocket соединений"""
    
    def __init__(self):
        # token -> {"websocket": ws, "site_id": id, "connected_at": datetime}
        self.active_connections: Dict[str, dict] = {}
    
    async def connect(self, websocket: WebSocket, token: str, site_id: int):
        """Принять новое соединение"""
        await websocket.accept()
        self.active_connections[token] = {
            "websocket": websocket,
            "site_id": site_id,
            "connected_at": datetime.now(),
            "last_seen": datetime.now()
        }
        logger.info(f"Agent connected: site_id={site_id}, token={token[:10]}...")
    
    def disconnect(self, token: str):
        """Закрыть соединение"""
        if token in self.active_connections:
            site_id = self.active_connections[token]["site_id"]
            del self.active_connections[token]
            logger.info(f"Agent disconnected: site_id={site_id}")
    
    async def send_command(self, token: str, command: dict) -> bool:
        """Отправить команду агенту"""
        if token not in self.active_connections:
            logger.warning(f"Agent not connected: {token[:10]}...")
            return False
        
        try:
            websocket = self.active_connections[token]["websocket"]
            await websocket.send_json(command)
            self.active_connections[token]["last_seen"] = datetime.now()
            return True
        except Exception as e:
            logger.error(f"Failed to send command: {e}")
            return False
    
    async def send_command_by_site_id(self, site_id: int, command: dict) -> bool:
        """Отправить команду по site_id"""
        for token, conn in self.active_connections.items():
            if conn["site_id"] == site_id:
                return await self.send_command(token, command)
        logger.warning(f"No active agent for site_id={site_id}")
        return False
    
    def get_online_sites(self) -> list:
        """Список site_id с активными агентами"""
        return [conn["site_id"] for conn in self.active_connections.values()]

# Глобальный экземпляр менеджера
manager = ConnectionManager()