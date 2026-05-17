# backend/app/models.py
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

# ============== Модели для запросов ==============

class UserRegisterRequest(BaseModel):
    email: str
    password: str
    name: Optional[str] = None

class UserLoginRequest(BaseModel):
    email: str
    password: str

class UserUpdateRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str

class SiteCreateRequest(BaseModel):
    url: str
    name: str
    git_repo_url: Optional[str] = None

class SiteUpdateRequest(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    active: Optional[bool] = None
    dashboard_mode: Optional[str] = None
    custom_dashboard_url: Optional[str] = None

class SiteCheckRequest(BaseModel):
    url: str

class NodeCreateRequest(BaseModel):
    name: str
    vps_ip: Optional[str] = None

class ServiceCreateRequest(BaseModel):
    name: str
    repo_url: Optional[str] = None
    deploy_path: Optional[str] = None
    build_command: Optional[str] = None
    restart_command: Optional[str] = None
    docker_compose: bool = True

# ============== Модели для ответов ==============

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int

class SiteResponse(BaseModel):
    id: int
    url: str
    name: str
    active: bool
    created_at: datetime
    last_status: Optional[int] = None
    last_check: Optional[datetime] = None

class UserResponse(BaseModel):
    id: int
    email: str
    name: Optional[str] = None
    created_at: datetime