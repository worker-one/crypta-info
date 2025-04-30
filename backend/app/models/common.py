# app/models/common.py
# (Only showing Country for brevity, assume others are okay unless they directly referenced removed Exchange fields)

from sqlalchemy import Column, Integer, String, Text, Table, ForeignKey # Added Table, ForeignKey
from sqlalchemy.orm import relationship

# Import Base from the central location
from .base import Base

# Need to define association tables used in back_populates if not defined elsewhere
# Assuming these are correctly defined in exchange.py as before
# If not, define them here or ensure they are loaded before this model.
# Example (if needed, but should be fine as defined in exchange.py):
# exchange_availability_table = Table(...)

class Country(Base):
    __tablename__ = 'countries'

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False, unique=True)
    code_iso_alpha2 = Column(String(2), nullable=False, unique=True, index=True)

    # Relationships defined in other models will point here using foreign keys.
    # Define the 'many' side of the relationships here for bidirectional linking.
    # These should still work as they point specifically to Exchange foreign keys.
    registered_exchanges = relationship(
        "Exchange",
        back_populates="registration_country",
        foreign_keys="Exchange.registration_country_id" # Specify FK explicitly
    )
    headquartered_exchanges = relationship(
        "Exchange",
        back_populates="headquarters_country",
        foreign_keys="Exchange.headquarters_country_id" # Specify FK explicitly
    )
    # M2M relationship back-reference defined in Exchange model
    available_exchanges = relationship(
        "Exchange",
        secondary='exchange_availability', # String name matches association table in exchange.py
        back_populates="available_in_countries"
    )
    licenses_issued = relationship("License", back_populates="jurisdiction_country")

    def __repr__(self):
        return f"<Country(id={self.id}, name='{self.name}', code='{self.code_iso_alpha2}')>"

# ... (Language, FiatCurrency, RatingCategory, ReviewTag remain the same) ...

class Language(Base):
    __tablename__ = 'languages'
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False, unique=True)
    code_iso_639_1 = Column(String(2), nullable=False, unique=True, index=True)
    exchanges = relationship(
        "Exchange",
        secondary='exchange_languages',
        back_populates="languages"
    )
    def __repr__(self):
        return f"<Language(id={self.id}, name='{self.name}', code='{self.code_iso_639_1}')>"

class FiatCurrency(Base):
    __tablename__ = 'fiat_currencies'
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False, unique=True)
    code_iso_4217 = Column(String(3), nullable=False, unique=True, index=True)
    exchanges = relationship(
        "Exchange",
        secondary='exchange_fiat_support',
        back_populates="supported_fiat_currencies"
    )
    def __repr__(self):
        return f"<FiatCurrency(id={self.id}, name='{self.name}', code='{self.code_iso_4217}')>"
