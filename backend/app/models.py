# backend/app/models.py
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

# Модели для запросов
class SiteCreate(BaseModel):
    url: str
    name: str
    git_repo_url: Optional[str] = None
    deploy_key: Optional[str] = None

class SiteUpdate(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    active: Optional[bool] = None

class UserCreate(BaseModel):
    email: str
    password: str
    name: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

# Модели для ответов
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

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"