# app/auth/service.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from fastapi import HTTPException, status
from typing import Optional

from app.models.user import User
from app.auth import schemas, security

class AuthService:

    async def get_user_by_email(self, db: AsyncSession, email: str) -> Optional[User]:
        result = await db.execute(select(User).filter(User.email == email))
        return result.scalar_one_or_none()

    async def get_user_by_nickname(self, db: AsyncSession, nickname: str) -> Optional[User]:
        result = await db.execute(select(User).filter(User.nickname == nickname))
        return result.scalar_one_or_none()

    async def get_user_by_id(self, db: AsyncSession, user_id: int) -> Optional[User]:
        result = await db.execute(select(User).filter(User.id == user_id))
        return result.scalar_one_or_none()

    async def create_user(self, db: AsyncSession, user_in: schemas.UserCreate) -> User:
        # Check if email exists
        existing_user = await self.get_user_by_email(db, email=user_in.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered.",
            )
        # Check if nickname exists
        existing_nickname = await self.get_user_by_nickname(db, nickname=user_in.nickname)
        if existing_nickname:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Nickname already taken.",
            )

        hashed_password = security.get_password_hash(user_in.password)
        db_user = User(
            email=user_in.email,
            nickname=user_in.nickname,
            avatar_url=user_in.avatar_url,
            password_hash=hashed_password,
            is_admin=False, # Default to non-admin
            # email_verified_at=None # Requires email verification flow
        )
        db.add(db_user)
        await db.commit()
        await db.refresh(db_user)
        return db_user

    async def authenticate_user(self, db: AsyncSession, email: str, password: str) -> Optional[User]:
        user = await self.get_user_by_email(db, email=email)
        if not user:
            return None
        if not security.verify_password(password, user.password_hash):
            return None
        # Add checks for active status or verified email if needed
        # if not user.is_active: return None
        return user

    async def update_user_profile(self, db: AsyncSession, db_user: User, user_in: schemas.UserUpdate) -> User:
        update_data = user_in.model_dump(exclude_unset=True)

        if "nickname" in update_data and update_data["nickname"] != db_user.nickname:
             # Check if new nickname exists
            existing_nickname = await self.get_user_by_nickname(db, nickname=update_data["nickname"])
            if existing_nickname and existing_nickname.id != db_user.id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Nickname already taken.",
                )
            db_user.nickname = update_data["nickname"]

        if "avatar_url" in update_data:
             db_user.avatar_url = update_data["avatar_url"]

        await db.commit()
        await db.refresh(db_user)
        return db_user

    async def update_user_password(self, db: AsyncSession, db_user: User, password_in: schemas.UserPasswordUpdate) -> User:
        if not security.verify_password(password_in.current_password, db_user.password_hash):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect current password")

        hashed_password = security.get_password_hash(password_in.new_password)
        db_user.password_hash = hashed_password
        await db.commit()
        # No need to refresh db_user here unless password_hash is needed immediately
        return db_user


auth_service = AuthService()