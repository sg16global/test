from sqlmodel import SQLModel, Field
from datetime import datetime
from typing import Optional


class StudentVerification(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    student_email: str = Field(index=True)
    full_name: str
    school_name: str
    student_id: Optional[str] = None
    verification_status: str = "pending"  # pending, approved, rejected
    submitted_at: datetime = Field(default_factory=datetime.utcnow)
    reviewed_at: Optional[datetime] = None
    reviewer_notes: Optional[str] = None
