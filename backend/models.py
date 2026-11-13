"""SQLAlchemy models."""
from datetime import datetime

from sqlalchemy import (
    JSON, Boolean, Column, DateTime, Float, ForeignKey, Index, Integer, String, Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from database import Base


def utcnow():
    return datetime.utcnow()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(40), unique=True, index=True, nullable=False)
    email = Column(String(254), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(120), default="")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utcnow)

    # Security bookkeeping
    token_version = Column(Integer, default=0, nullable=False)   # bump → every session ends
    failed_logins = Column(Integer, default=0, nullable=False)
    locked_until = Column(DateTime, nullable=True)
    last_login_at = Column(DateTime, nullable=True)

    farms = relationship("Farm", back_populates="owner", cascade="all, delete-orphan")
    calculations = relationship("Calculation", back_populates="user", cascade="all, delete-orphan")
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")


class RefreshToken(Base):
    """One row per issued refresh token. Only a SHA-256 hash is stored.

    Tokens rotate on every refresh. All tokens from one sign-in share a family_id,
    so if an already-used token is presented again (theft), the whole family is revoked.
    """
    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    token_hash = Column(String(64), unique=True, index=True, nullable=False)
    family_id = Column(String(32), index=True, nullable=False)
    remember = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    revoked_at = Column(DateTime, nullable=True)
    replaced_at = Column(DateTime, nullable=True)
    user_agent = Column(String(255), default="")
    ip = Column(String(64), default="")

    user = relationship("User", back_populates="refresh_tokens")


class OtpCode(Base):
    """Email one-time codes (password reset, clearing history). Stored hashed, with attempt limits."""
    __tablename__ = "otp_codes"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    purpose = Column(String(20), nullable=False)          # "reset" | "clear_history"
    code_hash = Column(String(64), nullable=False)
    attempts = Column(Integer, default=0, nullable=False)
    verified = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False)


class Farm(Base):
    __tablename__ = "farms"
    __table_args__ = (UniqueConstraint("owner_id", "farm_id", name="uq_farm_owner_farmid"),)

    id = Column(Integer, primary_key=True, index=True)
    farm_id = Column(String(100), index=True, nullable=False)   # unique per owner, not globally
    farmer_name = Column(String(255), nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    province = Column(String(100))
    district = Column(String(100))
    tehsil = Column(String(100))
    village = Column(String(100))
    area = Column(Float)
    harvested_area = Column(Float)
    soil_texture = Column(String(100))
    soil_organic_matter = Column(String(50))
    soil_drainage = Column(String(50))
    soil_ph = Column(String(50))
    climate = Column(String(100))
    moisture_regime = Column(String(100))
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    owner = relationship("User", back_populates="farms")
    seasons = relationship("Season", back_populates="farm", cascade="all, delete-orphan")


class Season(Base):
    __tablename__ = "seasons"

    id = Column(Integer, primary_key=True, index=True)
    farm_id = Column(Integer, ForeignKey("farms.id", ondelete="CASCADE"), index=True)
    season = Column(String(100))
    crop = Column(String(100), default="Cotton")
    variety = Column(String(100))
    seed_rate = Column(Float)
    seed_source = Column(String(100))
    seed_cotton_yield = Column(Float)
    fertiliser_data = Column(JSON, default=dict)
    irrigation_data = Column(JSON, default=dict)
    machinery_data = Column(JSON, default=dict)
    pest_protection_data = Column(JSON, default=dict)
    residue_data = Column(JSON, default=dict)
    labour_data = Column(JSON, default=dict)
    total_co2_equiv = Column(Float, nullable=True)
    intensity_per_kg = Column(Float, nullable=True)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    farm = relationship("Farm", back_populates="seasons")
    emissions = relationship("Emission", back_populates="season", cascade="all, delete-orphan")


class Emission(Base):
    __tablename__ = "emissions"

    id = Column(Integer, primary_key=True, index=True)
    season_id = Column(Integer, ForeignKey("seasons.id", ondelete="CASCADE"), index=True)
    source = Column(String(50))
    value = Column(Float)
    percentage = Column(Float)

    season = relationship("Season", back_populates="emissions")


class ContactMessage(Base):
    __tablename__ = "contact_messages"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(String(10))          # "info" or "tech"
    name = Column(String(120))
    email = Column(String(254))
    farm_id = Column(String(100), nullable=True)
    message = Column(Text)
    email_sent = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utcnow)


class Calculation(Base):
    """One row per calculation run: every input plus the results. This is the user's history."""
    __tablename__ = "calculations"
    __table_args__ = (Index("ix_calc_user_time", "user_id", "calculated_at"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)

    # Farm / farmer
    farm_id = Column(String(100), default="")
    farmer_name = Column(String(255), default="")
    country = Column(String(100), default="")
    province = Column(String(100), default="")
    district = Column(String(100), default="")
    tehsil = Column(String(100), default="")
    village = Column(String(100), default="")
    area = Column(Float, default=0)
    harvested_area = Column(Float, default=0)
    soil_texture = Column(String(100), default="")
    soil_organic_matter = Column(String(50), default="")
    soil_drainage = Column(String(50), default="")
    soil_ph = Column(String(50), default="")
    climate = Column(String(100), default="")
    moisture_regime = Column(String(100), default="")

    # Season / crop
    season = Column(String(100), default="")
    crop = Column(String(100), default="Cotton")
    variety = Column(String(100), default="")
    seed_rate = Column(Float, default=0)
    seed_source = Column(String(100), default="")
    seed_cotton_yield = Column(Float, default=0)

    # Inputs (JSON)
    fertiliser_data = Column(JSON, default=dict)
    irrigation_data = Column(JSON, default=dict)
    machinery_data = Column(JSON, default=dict)
    pest_protection_data = Column(JSON, default=dict)
    residue_data = Column(JSON, default=dict)
    labour_data = Column(JSON, default=dict)

    # Results
    total_co2_equiv = Column(Float, default=0)
    intensity_per_kg = Column(Float, default=0)
    breakdown = Column(JSON, default=dict)
    results = Column(JSON, default=dict)     # intensities, water, labour, fertiliser sub-breakdown

    calculated_at = Column(DateTime, default=utcnow)

    user = relationship("User", back_populates="calculations")
