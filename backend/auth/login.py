from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr

from supabase_client import supabase


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


@router.post("/login")
def login(data: LoginRequest):
    try:
        response = supabase.auth.sign_in_with_password({
            "email": data.email,
            "password": data.password,
        })

        user = response.user
        session = response.session

        if not user or not session:
            raise HTTPException(
                status_code=401,
                detail="Login gagal",
            )

        return {
            "message": "Login berhasil",
            "access_token": session.access_token,
            "refresh_token": session.refresh_token,
            "user": {
                "id": user.id,
                "email": user.email,
                "metadata": user.user_metadata,
            },
        }

    except HTTPException:
        raise

    except Exception as e:
        print("SUPABASE LOGIN ERROR:", repr(e))

        raise HTTPException(
            status_code=401,
            detail=str(e),
        )