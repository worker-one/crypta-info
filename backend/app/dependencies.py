# app/dependencies.py
from datetime import datetime, timezone
from typing import Optional, Annotated
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from jose import JWTError

# import User model
from app.models.user import User

from app.core.database import get_async_db
from app.core.config import settings
from app.auth.security import decode_token
from app.auth.service import auth_service

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

# Add the missing type field to the TokenPayload model
class TokenPayload(BaseModel):
    sub: str
    exp: datetime
    type: str  # Add this field for token type validation

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_async_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = decode_token(token)
        if payload is None:
            raise credentials_exception
            
        # Validate that this is an access token
        if payload.get("type") != "access":
            raise credentials_exception
            
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            raise credentials_exception
            
        # Validate token hasn't expired
        token_exp = payload.get("exp")
        if token_exp is None or datetime.fromtimestamp(token_exp, tz=timezone.utc) < datetime.now(timezone.utc):
            raise credentials_exception
            
        user_id = int(user_id_str)
    except (JWTError, ValueError):
        raise credentials_exception
        
    user = await auth_service.get_user_by_id(db=db, user_id=user_id)
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(
    current_user = Depends(get_current_user),
):
    # if not current_user.is_active:
    #     raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

async def get_current_admin_user(
    current_user: User = Depends(get_current_active_user)
) -> User:
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user doesn't have enough privileges"
        )
    return current_user