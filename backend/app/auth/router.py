# app/auth/router.py
from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Annotated

from app.core.database import get_async_db
from app.auth import schemas as auth_schemas
from app.schemas import token as token_schemas
from app.schemas import common as common_schemas
from app.auth.service import auth_service
from app.auth import security
from app.dependencies import get_current_active_user, get_current_user
from app.models.user import User # Import the User model

router = APIRouter(
    prefix="/auth",
    tags=["Authentication & Profile"]
)

@router.post("/register", response_model=auth_schemas.UserRead, status_code=status.HTTP_201_CREATED)
async def register_user(
    user_in: auth_schemas.UserCreate,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Register a new user.
    """
    db_user = await auth_service.create_user(db=db, user_in=user_in)
    # Here you would typically trigger an email verification flow
    return db_user

@router.post("/login", response_model=token_schemas.Token)
async def login_for_access_token(
    db: AsyncSession = Depends(get_async_db),
    form_data: auth_schemas.LoginRequest = Body(...) # Use Body for JSON payload
):
    """
    Authenticate user and return access and refresh tokens.
    """
    user = await auth_service.authenticate_user(
        db, email=form_data.email, password=form_data.password
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    # Add checks if user needs to be active or verified to login
    # if not user.email_verified_at: ...

    access_token = security.create_access_token(subject=user.id)
    refresh_token = security.create_refresh_token(subject=user.id)

    return token_schemas.Token(access_token=access_token, refresh_token=refresh_token)

@router.post("/refresh", response_model=token_schemas.Token)
async def refresh_access_token(
    refresh_request: token_schemas.RefreshTokenRequest,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get a new access token using a refresh token.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate refresh token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = security.decode_token(refresh_request.refresh_token)
    if payload is None or payload.get("type") != "refresh":
        raise credentials_exception

    user_id_str = payload.get("sub")
    if user_id_str is None:
        raise credentials_exception
    try:
        user_id = int(user_id_str)
    except ValueError:
        raise credentials_exception

    user = await auth_service.get_user_by_id(db=db, user_id=user_id)
    if user is None:
        raise credentials_exception # User might have been deleted

    # Generate new tokens
    new_access_token = security.create_access_token(subject=user.id)
    # Optionally, generate a new refresh token as well for rotation
    new_refresh_token = security.create_refresh_token(subject=user.id)

    return token_schemas.Token(access_token=new_access_token, refresh_token=new_refresh_token)


# --- Profile Endpoints ---

CurrentUser = Annotated[User, Depends(get_current_active_user)]

@router.get("/profile", response_model=auth_schemas.UserRead)
async def read_users_me(current_user: CurrentUser):
    """
    Get current logged-in user's profile.
    """
    return current_user

@router.patch("/profile", response_model=auth_schemas.UserRead)
async def update_users_me(
    user_in: auth_schemas.UserUpdate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_async_db),
):
    """
    Update current logged-in user's profile (nickname, avatar).
    """
    updated_user = await auth_service.update_user_profile(db=db, db_user=current_user, user_in=user_in)
    return updated_user

@router.put("/profile/password", response_model=common_schemas.Message)
async def update_users_password(
    password_in: auth_schemas.UserPasswordUpdate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_async_db),
):
    """
    Update current logged-in user's password.
    """
    await auth_service.update_user_password(db=db, db_user=current_user, password_in=password_in)
    return common_schemas.Message(message="Password updated successfully")

# Add endpoint for forgot password / reset password flow if needed