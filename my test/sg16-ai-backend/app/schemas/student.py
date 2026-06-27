from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional


class StudentVerificationCreate(BaseModel):
    student_email: EmailStr
    full_name: str
    school_name: str
    student_id: Optional[str] = None


class StudentVerificationResponse(BaseModel):
    id: int
    verification_status: str
    student_email: str
    school_name: str
    submitted_at: datetime
