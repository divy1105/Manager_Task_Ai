"""Pydantic schemas for request/response validation."""
from typing import Optional

from pydantic import BaseModel


class ExtractRequest(BaseModel):
    notes: str


class TaskBase(BaseModel):
    description: str
    owner: str = "Unassigned"
    due_date: Optional[str] = None
    priority: str = "Medium"
    status: str = "To Do"


class TaskUpdate(BaseModel):
    """All fields optional — only send what you want to change."""
    description: Optional[str] = None
    owner: Optional[str] = None
    due_date: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None


class TaskOut(TaskBase):
    id: int

    class Config:
        from_attributes = True
