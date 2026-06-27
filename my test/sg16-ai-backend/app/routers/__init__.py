from .auth import router as auth_router
from .chat import router as chat_router
from .safety import router as safety_router
from .student import router as student_router

__all__ = ["auth_router", "chat_router", "safety_router", "student_router"]
