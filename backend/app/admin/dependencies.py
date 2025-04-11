# app/admin/dependencies.py
from fastapi import Depends
from app.dependencies import get_current_admin_user # Import the dependency
from app.models.user import User

# You can re-export it or just import directly in the admin router
AdminUser = Depends(get_current_admin_user)