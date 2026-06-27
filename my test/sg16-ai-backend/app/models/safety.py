from sqlmodel import SQLModel, Field
from datetime import datetime
from typing import Optional


class SafetyLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    scan_type: str = "url"  # url, text, file, link
    input_data: str
    safe: bool = True
    threats: str = ""  # JSON string of threats
    score: int = 100
    created_at: datetime = Field(default_factory=datetime.utcnow)
