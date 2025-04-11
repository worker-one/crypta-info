# app/models/base.py
from sqlalchemy.orm import declarative_base

# Define the Base here so other models can import it
Base = declarative_base()