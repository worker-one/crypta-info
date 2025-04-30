# app/schemas/item.py
from pydantic import BaseModel

# Base schema for common attributes
class ItemBase(BaseModel):
    name: str
    # Add other common fields

# Schema for reading item data (e.g., in API responses)
class ItemRead(ItemBase):
    id: int

    class Config:
        orm_mode = True # Enable ORM mode for compatibility with SQLAlchemy models

# Schema for creating an item (if needed later)
# class ItemCreate(ItemBase):
#     pass

# Schema for updating an item (if needed later)
# class ItemUpdate(ItemBase):
#     pass

