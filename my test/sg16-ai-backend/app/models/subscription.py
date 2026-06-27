from sqlmodel import SQLModel, Field
from datetime import datetime
from typing import Optional


class Subscription(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    tier: str = "free"  # free, student, pro
    status: str = "active"  # active, cancelled, expired
    started_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = None
    stripe_subscription_id: Optional[str] = None
