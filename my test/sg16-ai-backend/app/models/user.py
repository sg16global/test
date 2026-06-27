from sqlmodel import SQLModel, Field
from datetime import datetime
from typing import Optional


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True)
    hashed_password: str
    full_name: Optional[str] = None
    is_student: bool = False
    student_verified: bool = False
    subscription_tier: str = "free"  # free, student, pro
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True
