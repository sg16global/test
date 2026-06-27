from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.student import StudentVerification
from app.schemas.student import StudentVerificationCreate, StudentVerificationResponse

router = APIRouter(tags=["student"])


@router.post("/student/verify", response_model=StudentVerificationResponse)
async def submit_student_verification(
    data: StudentVerificationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Check if already has pending request
    existing = db.exec(
        select(StudentVerification).where(
            StudentVerification.user_id == current_user.id,
            StudentVerification.verification_status == "pending",
        )
    ).first()
    if existing:
        raise HTTPException(400, "You already have a pending verification request")

    verification = StudentVerification(
        user_id=current_user.id,
        student_email=data.student_email,
        full_name=data.full_name,
        school_name=data.school_name,
        student_id=data.student_id,
    )
    db.add(verification)
    db.commit()
    db.refresh(verification)

    # Auto-approve if school email ends with .edu
    if data.student_email.lower().endswith((".edu", ".ac.in", ".edu.cn")):
        verification.verification_status = "approved"
        current_user.is_student = True
        current_user.student_verified = True
        current_user.subscription_tier = "student"
        db.add(current_user)
        db.commit()

    return verification


@router.get("/student/status", response_model=StudentVerificationResponse)
async def get_student_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verification = db.exec(
        select(StudentVerification)
        .where(StudentVerification.user_id == current_user.id)
        .order_by(StudentVerification.submitted_at.desc())
    ).first()
    if not verification:
        raise HTTPException(404, "No verification request found")
    return verification
