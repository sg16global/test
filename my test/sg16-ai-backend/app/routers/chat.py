from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.chat import Chat, Message
from app.schemas.chat import ChatRequest
from app.services.ai_service import get_ai_response

router = APIRouter(tags=["chat"])


@router.post("/chat")
async def chat(
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Create chat if not exists
    if not request.chat_id:
        chat_obj = Chat(user_id=current_user.id, title="New Chat")
        db.add(chat_obj)
        db.commit()
        db.refresh(chat_obj)
    else:
        chat_obj = db.get(Chat, request.chat_id)
        if not chat_obj or chat_obj.user_id != current_user.id:
            raise HTTPException(404, "Chat not found or access denied")

    # Save user message
    user_msg = Message(chat_id=chat_obj.id, role="user", content=request.message)
    db.add(user_msg)
    db.commit()

    # Get AI response
    system_prompt = (
        request.system_prompt
        or "You are SG16, the most powerful AI engine by SaifTech Global Limited."
    )
    ai_response = await get_ai_response(request.message, system_prompt)

    # Save assistant message
    assistant_msg = Message(
        chat_id=chat_obj.id, role="assistant", content=ai_response
    )
    db.add(assistant_msg)
    db.commit()

    return {"response": ai_response, "chat_id": chat_obj.id, "message": "SG16 AI Response"}
