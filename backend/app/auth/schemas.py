# app/auth/schemas.py
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

# --- User Schemas ---
class UserBase(BaseModel):
    email: EmailStr
    nickname: str = Field(..., min_length=3, max_length=50)
    avatar_url: Optional[str] = None

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)

class UserRead(UserBase):
    id: int
    is_admin: bool
    email_verified_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    nickname: Optional[str] = Field(None, min_length=3, max_length=50)
    avatar_url: Optional[str] = None
    # Email cannot be updated directly through this schema

class UserPasswordUpdate(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)

# --- Login Schemas ---
class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    
class TokenPayload(BaseModel):
    sub: int
    exp: datetime
    # Add other claims if needed