from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from supabase_client import supabase


router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"],
)


class ResetPasswordRequest(BaseModel):
    access_token: str
    new_password: str = Field(
        min_length=8,
        max_length=72,
    )


@router.post("/reset-password")
def reset_password(
    data: ResetPasswordRequest,
):
    try:
        # =========================================================
        # 1. VALIDASI ACCESS TOKEN
        # =========================================================

        result = supabase.auth.get_user(
            data.access_token
        )

        if not result or not result.user:
            raise HTTPException(
                status_code=401,
                detail=(
                    "Token reset password "
                    "tidak valid atau sudah expired."
                ),
            )

        user = result.user

        # =========================================================
        # 2. BUAT SESSION DARI ACCESS TOKEN
        # =========================================================

        supabase.auth.set_session(
            data.access_token,
            "",
        )

        # =========================================================
        # 3. UPDATE PASSWORD
        # =========================================================

        update_result = supabase.auth.update_user({
            "password": data.new_password,
        })

        if not update_result or not update_result.user:
            raise HTTPException(
                status_code=400,
                detail="Password gagal diubah.",
            )

        # =========================================================
        # 4. RESPONSE
        # =========================================================

        return {
            "success": True,
            "message": "Password berhasil diubah.",
            "user_id": user.id,
            "email": user.email,
        }

    except HTTPException:
        raise

    except Exception as e:
        print("RESET PASSWORD ERROR:", repr(e))

        raise HTTPException(
            status_code=400,
            detail=f"Reset password gagal: {str(e)}",
        )