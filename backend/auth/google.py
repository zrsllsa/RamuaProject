
from fastapi import APIRouter, HTTPException

from supabase_client import supabase


router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"],
)


@router.get("/google")
def google_login():
    try:

        result = supabase.auth.sign_in_with_oauth({
            "provider": "google",
            "options": {
                "redirect_to": (
                    "http://127.0.0.1:8001/api/auth/google/callback"
                )
            }
        })

        return {
            "url": result.url
        }

    except Exception as e:

        print(
            "GOOGLE LOGIN ERROR:",
            repr(e)
        )

        raise HTTPException(
            status_code=400,
            detail=(
                f"Login Google gagal: {str(e)}"
            )
        )


@router.get("/google/callback")
def google_callback(code: str):

    try:

        result = supabase.auth.exchange_code_for_session(
            {
                "auth_code": code,
            }
        )

        if not result.user or not result.session:

            raise HTTPException(
                status_code=401,
                detail="Login Google gagal.",
            )

        user = result.user
        session = result.session

        metadata = user.user_metadata or {}

        return {

            "success": True,

            "message": "Login Google berhasil!",

            "user": {

                "user_id": user.id,

                "email": user.email,

                "name": (
                    metadata.get("nickname")
                    or metadata.get("full_name")
                    or user.email
                ),

                "avatar_url": metadata.get("avatar_url"),

            },

            "access_token": session.access_token,

            "refresh_token": session.refresh_token,

            "token_type": "bearer",

        }

    except HTTPException:

        raise

    except Exception as e:

        print(
            "GOOGLE CALLBACK ERROR:",
            repr(e)
        )

        raise HTTPException(
            status_code=401,
            detail=(
                f"Login Google gagal: {str(e)}"
            ),
        )
