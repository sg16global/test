from pydantic import BaseModel
from typing import List, Optional


class SafetyScanRequest(BaseModel):
    text: Optional[str] = None
    url: Optional[str] = None


class SafetyScanResponse(BaseModel):
    safe: bool
    threats: List[str]
    score: int
    recommendation: str
