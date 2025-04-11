# app/core/database.py
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from typing import AsyncGenerator

from .config import settings
from ..models.base import Base

# Create async engine instance
engine = create_async_engine(settings.DATABASE_URL, pool_pre_ping=True, echo=False) # Set echo=True for debugging SQL

# Create sessionmaker
AsyncSessionFactory = async_sessionmaker(
    engine,
    expire_on_commit=False,
    class_=AsyncSession
)

#!/usr/bin/env python
"""
Script to initialize the countries table with ISO 3166-1 alpha-2 country codes.
"""

import os
import sys
import csv
from pathlib import Path

# Add the parent directory to sys.path to import app modules
current_path = Path(__file__).parent
parent_path = current_path.parent
sys.path.append(str(parent_path))

from ..models.base import Base
from ..models.common import Country


async def init_countries():
    """Initialize the countries table with ISO 3166-1 alpha-2 country codes."""
    # Dictionary of countries with their ISO 3166-1 alpha-2 codes
    countries = [
        {"name": "Afghanistan", "code_iso_alpha2": "AF"},
        {"name": "Albania", "code_iso_alpha2": "AL"},
        {"name": "Algeria", "code_iso_alpha2": "DZ"},
        {"name": "Andorra", "code_iso_alpha2": "AD"},
        {"name": "Angola", "code_iso_alpha2": "AO"},
        {"name": "Antigua and Barbuda", "code_iso_alpha2": "AG"},
        {"name": "Argentina", "code_iso_alpha2": "AR"},
        {"name": "Armenia", "code_iso_alpha2": "AM"},
        {"name": "Australia", "code_iso_alpha2": "AU"},
        {"name": "Austria", "code_iso_alpha2": "AT"},
        {"name": "Azerbaijan", "code_iso_alpha2": "AZ"},
        {"name": "Bahamas", "code_iso_alpha2": "BS"},
        {"name": "Bahrain", "code_iso_alpha2": "BH"},
        {"name": "Bangladesh", "code_iso_alpha2": "BD"},
        {"name": "Barbados", "code_iso_alpha2": "BB"},
        {"name": "Belarus", "code_iso_alpha2": "BY"},
        {"name": "Belgium", "code_iso_alpha2": "BE"},
        {"name": "Belize", "code_iso_alpha2": "BZ"},
        {"name": "Benin", "code_iso_alpha2": "BJ"},
        {"name": "Bhutan", "code_iso_alpha2": "BT"},
        {"name": "Bolivia", "code_iso_alpha2": "BO"},
        {"name": "Bosnia and Herzegovina", "code_iso_alpha2": "BA"},
        {"name": "Botswana", "code_iso_alpha2": "BW"},
        {"name": "Brazil", "code_iso_alpha2": "BR"},
        {"name": "Brunei", "code_iso_alpha2": "BN"},
        {"name": "Bulgaria", "code_iso_alpha2": "BG"},
        {"name": "Burkina Faso", "code_iso_alpha2": "BF"},
        {"name": "Burundi", "code_iso_alpha2": "BI"},
        {"name": "Cabo Verde", "code_iso_alpha2": "CV"},
        {"name": "Cambodia", "code_iso_alpha2": "KH"},
        {"name": "Cameroon", "code_iso_alpha2": "CM"},
        {"name": "Canada", "code_iso_alpha2": "CA"},
        {"name": "Central African Republic", "code_iso_alpha2": "CF"},
        {"name": "Chad", "code_iso_alpha2": "TD"},
        {"name": "Chile", "code_iso_alpha2": "CL"},
        {"name": "China", "code_iso_alpha2": "CN"},
        {"name": "Colombia", "code_iso_alpha2": "CO"},
        {"name": "Comoros", "code_iso_alpha2": "KM"},
        {"name": "Congo, Democratic Republic of the", "code_iso_alpha2": "CD"},
        {"name": "Congo, Republic of the", "code_iso_alpha2": "CG"},
        {"name": "Costa Rica", "code_iso_alpha2": "CR"},
        {"name": "Croatia", "code_iso_alpha2": "HR"},
        {"name": "Cuba", "code_iso_alpha2": "CU"},
        {"name": "Cyprus", "code_iso_alpha2": "CY"},
        {"name": "Czech Republic", "code_iso_alpha2": "CZ"},
        {"name": "Denmark", "code_iso_alpha2": "DK"},
        {"name": "Djibouti", "code_iso_alpha2": "DJ"},
        {"name": "Dominica", "code_iso_alpha2": "DM"},
        {"name": "Dominican Republic", "code_iso_alpha2": "DO"},
        {"name": "East Timor", "code_iso_alpha2": "TL"},
        {"name": "Ecuador", "code_iso_alpha2": "EC"},
        {"name": "Egypt", "code_iso_alpha2": "EG"},
        {"name": "El Salvador", "code_iso_alpha2": "SV"},
        {"name": "Equatorial Guinea", "code_iso_alpha2": "GQ"},
        {"name": "Eritrea", "code_iso_alpha2": "ER"},
        {"name": "Estonia", "code_iso_alpha2": "EE"},
        {"name": "Eswatini", "code_iso_alpha2": "SZ"},
        {"name": "Ethiopia", "code_iso_alpha2": "ET"},
        {"name": "Fiji", "code_iso_alpha2": "FJ"},
        {"name": "Finland", "code_iso_alpha2": "FI"},
        {"name": "France", "code_iso_alpha2": "FR"},
        {"name": "Gabon", "code_iso_alpha2": "GA"},
        {"name": "Gambia", "code_iso_alpha2": "GM"},
        {"name": "Georgia", "code_iso_alpha2": "GE"},
        {"name": "Germany", "code_iso_alpha2": "DE"},
        {"name": "Ghana", "code_iso_alpha2": "GH"},
        {"name": "Greece", "code_iso_alpha2": "GR"},
        {"name": "Grenada", "code_iso_alpha2": "GD"},
        {"name": "Guatemala", "code_iso_alpha2": "GT"},
        {"name": "Guinea", "code_iso_alpha2": "GN"},
        {"name": "Guinea-Bissau", "code_iso_alpha2": "GW"},
        {"name": "Guyana", "code_iso_alpha2": "GY"},
        {"name": "Haiti", "code_iso_alpha2": "HT"},
        {"name": "Honduras", "code_iso_alpha2": "HN"},
        {"name": "Hungary", "code_iso_alpha2": "HU"},
        {"name": "Iceland", "code_iso_alpha2": "IS"},
        {"name": "India", "code_iso_alpha2": "IN"},
        {"name": "Indonesia", "code_iso_alpha2": "ID"},
        {"name": "Iran", "code_iso_alpha2": "IR"},
        {"name": "Iraq", "code_iso_alpha2": "IQ"},
        {"name": "Ireland", "code_iso_alpha2": "IE"},
        {"name": "Israel", "code_iso_alpha2": "IL"},
        {"name": "Italy", "code_iso_alpha2": "IT"},
        {"name": "Jamaica", "code_iso_alpha2": "JM"},
        {"name": "Japan", "code_iso_alpha2": "JP"},
        {"name": "Jordan", "code_iso_alpha2": "JO"},
        {"name": "Kazakhstan", "code_iso_alpha2": "KZ"},
        {"name": "Kenya", "code_iso_alpha2": "KE"},
        {"name": "Kiribati", "code_iso_alpha2": "KI"},
        {"name": "Korea, North", "code_iso_alpha2": "KP"},
        {"name": "Korea, South", "code_iso_alpha2": "KR"},
        {"name": "Kosovo", "code_iso_alpha2": "XK"},
        {"name": "Kuwait", "code_iso_alpha2": "KW"},
        {"name": "Kyrgyzstan", "code_iso_alpha2": "KG"},
        {"name": "Laos", "code_iso_alpha2": "LA"},
        {"name": "Latvia", "code_iso_alpha2": "LV"},
        {"name": "Lebanon", "code_iso_alpha2": "LB"},
        {"name": "Lesotho", "code_iso_alpha2": "LS"},
        {"name": "Liberia", "code_iso_alpha2": "LR"},
        {"name": "Libya", "code_iso_alpha2": "LY"},
        {"name": "Liechtenstein", "code_iso_alpha2": "LI"},
        {"name": "Lithuania", "code_iso_alpha2": "LT"},
        {"name": "Luxembourg", "code_iso_alpha2": "LU"},
        {"name": "Madagascar", "code_iso_alpha2": "MG"},
        {"name": "Malawi", "code_iso_alpha2": "MW"},
        {"name": "Malaysia", "code_iso_alpha2": "MY"},
        {"name": "Maldives", "code_iso_alpha2": "MV"},
        {"name": "Mali", "code_iso_alpha2": "ML"},
        {"name": "Malta", "code_iso_alpha2": "MT"},
        {"name": "Marshall Islands", "code_iso_alpha2": "MH"},
        {"name": "Mauritania", "code_iso_alpha2": "MR"},
        {"name": "Mauritius", "code_iso_alpha2": "MU"},
        {"name": "Mexico", "code_iso_alpha2": "MX"},
        {"name": "Micronesia", "code_iso_alpha2": "FM"},
        {"name": "Moldova", "code_iso_alpha2": "MD"},
        {"name": "Monaco", "code_iso_alpha2": "MC"},
        {"name": "Mongolia", "code_iso_alpha2": "MN"},
        {"name": "Montenegro", "code_iso_alpha2": "ME"},
        {"name": "Morocco", "code_iso_alpha2": "MA"},
        {"name": "Mozambique", "code_iso_alpha2": "MZ"},
        {"name": "Myanmar", "code_iso_alpha2": "MM"},
        {"name": "Namibia", "code_iso_alpha2": "NA"},
        {"name": "Nauru", "code_iso_alpha2": "NR"},
        {"name": "Nepal", "code_iso_alpha2": "NP"},
        {"name": "Netherlands", "code_iso_alpha2": "NL"},
        {"name": "New Zealand", "code_iso_alpha2": "NZ"},
        {"name": "Nicaragua", "code_iso_alpha2": "NI"},
        {"name": "Niger", "code_iso_alpha2": "NE"},
        {"name": "Nigeria", "code_iso_alpha2": "NG"},
        {"name": "North Macedonia", "code_iso_alpha2": "MK"},
        {"name": "Norway", "code_iso_alpha2": "NO"},
        {"name": "Oman", "code_iso_alpha2": "OM"},
        {"name": "Pakistan", "code_iso_alpha2": "PK"},
        {"name": "Palau", "code_iso_alpha2": "PW"},
        {"name": "Palestine", "code_iso_alpha2": "PS"},
        {"name": "Panama", "code_iso_alpha2": "PA"},
        {"name": "Papua New Guinea", "code_iso_alpha2": "PG"},
        {"name": "Paraguay", "code_iso_alpha2": "PY"},
        {"name": "Peru", "code_iso_alpha2": "PE"},
        {"name": "Philippines", "code_iso_alpha2": "PH"},
        {"name": "Poland", "code_iso_alpha2": "PL"},
        {"name": "Portugal", "code_iso_alpha2": "PT"},
        {"name": "Qatar", "code_iso_alpha2": "QA"},
        {"name": "Romania", "code_iso_alpha2": "RO"},
        {"name": "Russia", "code_iso_alpha2": "RU"},
        {"name": "Rwanda", "code_iso_alpha2": "RW"},
        {"name": "Saint Kitts and Nevis", "code_iso_alpha2": "KN"},
        {"name": "Saint Lucia", "code_iso_alpha2": "LC"},
        {"name": "Saint Vincent and the Grenadines", "code_iso_alpha2": "VC"},
        {"name": "Samoa", "code_iso_alpha2": "WS"},
        {"name": "San Marino", "code_iso_alpha2": "SM"},
        {"name": "Sao Tome and Principe", "code_iso_alpha2": "ST"},
        {"name": "Saudi Arabia", "code_iso_alpha2": "SA"},
        {"name": "Senegal", "code_iso_alpha2": "SN"},
        {"name": "Serbia", "code_iso_alpha2": "RS"},
        {"name": "Seychelles", "code_iso_alpha2": "SC"},
        {"name": "Sierra Leone", "code_iso_alpha2": "SL"},
        {"name": "Singapore", "code_iso_alpha2": "SG"},
        {"name": "Slovakia", "code_iso_alpha2": "SK"},
        {"name": "Slovenia", "code_iso_alpha2": "SI"},
        {"name": "Solomon Islands", "code_iso_alpha2": "SB"},
        {"name": "Somalia", "code_iso_alpha2": "SO"},
        {"name": "South Africa", "code_iso_alpha2": "ZA"},
        {"name": "South Sudan", "code_iso_alpha2": "SS"},
        {"name": "Spain", "code_iso_alpha2": "ES"},
        {"name": "Sri Lanka", "code_iso_alpha2": "LK"},
        {"name": "Sudan", "code_iso_alpha2": "SD"},
        {"name": "Suriname", "code_iso_alpha2": "SR"},
        {"name": "Sweden", "code_iso_alpha2": "SE"},
        {"name": "Switzerland", "code_iso_alpha2": "CH"},
        {"name": "Syria", "code_iso_alpha2": "SY"},
        {"name": "Taiwan", "code_iso_alpha2": "TW"},
        {"name": "Tajikistan", "code_iso_alpha2": "TJ"},
        {"name": "Tanzania", "code_iso_alpha2": "TZ"},
        {"name": "Thailand", "code_iso_alpha2": "TH"},
        {"name": "Togo", "code_iso_alpha2": "TG"},
        {"name": "Tonga", "code_iso_alpha2": "TO"},
        {"name": "Trinidad and Tobago", "code_iso_alpha2": "TT"},
        {"name": "Tunisia", "code_iso_alpha2": "TN"},
        {"name": "Turkey", "code_iso_alpha2": "TR"},
        {"name": "Turkmenistan", "code_iso_alpha2": "TM"},
        {"name": "Tuvalu", "code_iso_alpha2": "TV"},
        {"name": "Uganda", "code_iso_alpha2": "UG"},
        {"name": "Ukraine", "code_iso_alpha2": "UA"},
        {"name": "United Arab Emirates", "code_iso_alpha2": "AE"},
        {"name": "United Kingdom", "code_iso_alpha2": "GB"},
        {"name": "United States", "code_iso_alpha2": "US"},
        {"name": "Uruguay", "code_iso_alpha2": "UY"},
        {"name": "Uzbekistan", "code_iso_alpha2": "UZ"},
        {"name": "Vanuatu", "code_iso_alpha2": "VU"},
        {"name": "Vatican City", "code_iso_alpha2": "VA"},
        {"name": "Venezuela", "code_iso_alpha2": "VE"},
        {"name": "Vietnam", "code_iso_alpha2": "VN"},
        {"name": "Yemen", "code_iso_alpha2": "YE"},
        {"name": "Zambia", "code_iso_alpha2": "ZM"},
        {"name": "Zimbabwe", "code_iso_alpha2": "ZW"},
    ]
    async with AsyncSessionFactory() as db:
        try:
            # Check if data already exists
            from sqlalchemy import text
            result = await db.execute(text("SELECT COUNT(*) FROM countries"))
            existing_count = result.scalar()
            
            if existing_count == 0:
                print(f"Initializing countries table with {len(countries)} countries")
                for country_data in countries:
                    country = Country(**country_data)
                    db.add(country)
                
                await db.commit()
                print("Country data has been successfully added to the database.")
            else:
                print(f"Countries table already contains {existing_count} records. No data added.")
                
        except Exception as e:
            await db.rollback()
            print(f"Error initializing countries table: {e}")


# Dependency to get DB session
async def get_async_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionFactory() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

# Init database schema via Base.metadata.create_all
async def init_db() -> None:
    try:
        async with engine.begin() as conn:
            # This will create all tables defined in the Base's subclasses
            await conn.run_sync(Base.metadata.create_all)
    except Exception as e:
        print(f"Error initializing database: {e}")
        raise
    finally:
        await engine.dispose()