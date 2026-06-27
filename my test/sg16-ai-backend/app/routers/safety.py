from fastapi import APIRouter
from app.services.safety_service import scan_content

router = APIRouter(tags=["safety"])


@router.post("/safety/scan")
async def safety_scan(text: str = "", url: str = None):
    result = await scan_content(text, url)
    return result
