"""SQLAlchemy model for a Task."""
from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String

from database import Base


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    description = Column(String, nullable=False)
    owner = Column(String, nullable=False, default="Unassigned")
    due_date = Column(String, nullable=True)  # ISO date "YYYY-MM-DD" or None
    priority = Column(String, nullable=False, default="Medium")  # Low / Medium / High
    status = Column(String, nullable=False, default="To Do")  # To Do / In Progress / Done
    created_at = Column(DateTime, default=datetime.utcnow)
