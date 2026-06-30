"""SQLAlchemy 2.x ORM models mirroring DATABASE_SCHEMA.md.

jsonb columns from the Postgres design are modeled as portable JSON columns so the
same models work on SQLite (local dev) and Postgres (prod).
"""
from datetime import date, datetime
from typing import Any, List, Optional

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(Text)
    email: Mapped[str] = mapped_column(Text, unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    resumes: Mapped[List["Resume"]] = relationship(back_populates="user")
    jobs: Mapped[List["Job"]] = relationship(back_populates="user")
    applications: Mapped[List["Application"]] = relationship(back_populates="user")
    messages: Mapped[List["Message"]] = relationship(back_populates="user")


class Resume(Base):
    __tablename__ = "resumes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    filename: Mapped[str] = mapped_column(Text)
    candidate_name: Mapped[str] = mapped_column(Text)
    email: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # jsonb fields
    links: Mapped[dict] = mapped_column(JSON, default=dict)
    skills: Mapped[list] = mapped_column(JSON, default=list)
    projects: Mapped[list] = mapped_column(JSON, default=list)
    education: Mapped[list] = mapped_column(JSON, default=list)
    experience: Mapped[list] = mapped_column(JSON, default=list)
    best_fit_roles: Mapped[list] = mapped_column(JSON, default=list)
    missing_keywords: Mapped[list] = mapped_column(JSON, default=list)
    raw_text: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="resumes")


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(Text)
    company: Mapped[str] = mapped_column(Text)
    location: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    description: Mapped[str] = mapped_column(Text, default="")
    url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    source: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    easy_apply: Mapped[bool] = mapped_column(Boolean, default=False)
    score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, index=True)
    recommendation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    red_flags: Mapped[list] = mapped_column(JSON, default=list)
    score_breakdown: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="jobs")


class Application(Base):
    __tablename__ = "applications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    resume_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("resumes.id"), nullable=True
    )
    job_id: Mapped[Optional[int]] = mapped_column(ForeignKey("jobs.id"), nullable=True)
    company: Mapped[str] = mapped_column(Text)
    job_title: Mapped[str] = mapped_column(Text)
    location: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    job_link: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    fit_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    resume_version: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    date_applied: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="Saved", index=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    follow_up_date: Mapped[Optional[date]] = mapped_column(
        Date, nullable=True, index=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    user: Mapped["User"] = relationship(back_populates="applications")


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    job_id: Mapped[Optional[int]] = mapped_column(ForeignKey("jobs.id"), nullable=True)
    type: Mapped[str] = mapped_column(Text)
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="messages")
