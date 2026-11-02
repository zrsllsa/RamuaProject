import hashlib
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr

from supabase_client import supabase


router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"],
)


class VerifyEmailRequest(BaseModel):
    email: EmailStr
    otp: str


@router.post("/verify-email")
def verify_email(data: VerifyEmailRequest):
    try:
        # 1. Normalisasi data
        email = str(data.email).lower().strip()
        otp = str(data.otp).strip()

        # 2. Validasi OTP
        if not otp.isdigit():
            raise HTTPException(
                status_code=400,
                detail="OTP harus berupa angka.",
            )

        if len(otp) != 6:
            raise HTTPException(
                status_code=400,
                detail="OTP harus terdiri dari 6 digit.",
            )

        # 3. Hash OTP
        otp_hash = hashlib.sha256(
            otp.encode("utf-8")
        ).hexdigest()

        # 4. Cari pending registration
        result = (
            supabase
            .table("pending_registrations")
            .select("*")
            .eq("email", email)
            .limit(1)
            .execute()
        )

        if not result.data:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Data registrasi tidak ditemukan. "
                    "Silakan daftar kembali."
                ),
            )

        pending = result.data[0]

        # 5. Validasi OTP
        stored_otp_hash = pending.get("otp_hash")

        if not stored_otp_hash:
            raise HTTPException(
                status_code=400,
                detail="OTP belum tersimpan.",
            )

        if str(stored_otp_hash).strip() != otp_hash:
            raise HTTPException(
                status_code=400,
                detail="OTP tidak valid.",
            )

        # 6. Cek waktu expired
        expires_at_raw = pending.get("expires_at")

        if not expires_at_raw:
            raise HTTPException(
                status_code=400,
                detail="Waktu kedaluwarsa OTP tidak ditemukan.",
            )

        try:
            expires_at = datetime.fromisoformat(
                str(expires_at_raw).replace(
                    "Z",
                    "+00:00",
                )
            )
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Format waktu OTP tidak valid.",
            )

        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(
                tzinfo=timezone.utc
            )

        now = datetime.now(timezone.utc)

        if now > expires_at:
            raise HTTPException(
                status_code=400,
                detail="OTP sudah kedaluwarsa.",
            )

        # 7. Ambil data registrasi
        name = pending.get("name")
        password = pending.get("password")
        pending_email = pending.get("email")

        if not name:
            raise HTTPException(
                status_code=400,
                detail="Nama registrasi tidak ditemukan.",
            )

        if not password:
            raise HTTPException(
                status_code=400,
                detail="Password registrasi tidak ditemukan.",
            )

        if not pending_email:
            raise HTTPException(
                status_code=400,
                detail="Email registrasi tidak ditemukan.",
            )

        pending_email = str(
            pending_email
        ).lower().strip()

        # 8. Cek user Auth
        try:
            users = supabase.auth.admin.list_users()

            for user in users:
                if (
                    user.email
                    and user.email.lower().strip()
                    == pending_email
                ):
                    raise HTTPException(
                        status_code=409,
                        detail=(
                            "Email sudah terdaftar. "
                            "Silakan login."
                        ),
                    )

        except HTTPException:
            raise
        except Exception as e:
            print(
                "AUTH USER CHECK ERROR:",
                repr(e),
            )

        # 9. Buat user di Supabase Auth
        user_result = supabase.auth.admin.create_user({
            "email": pending_email,
            "password": password,
            "email_confirm": True,
            "user_metadata": {
                "nickname": name,
            },
        })

        if not user_result.user:
            raise HTTPException(
                status_code=400,
                detail="Gagal membuat akun.",
            )

        user_id = user_result.user.id

        # 10. Hapus pending registration
        (
            supabase
            .table("pending_registrations")
            .delete()
            .eq("email", pending_email)
            .execute()
        )

        # 11. Berhasil
        return {
            "success": True,
            "message": (
                "OTP berhasil diverifikasi. "
                "Registrasi berhasil."
            ),
            "email": pending_email,
            "user_id": user_id,
            "redirect": "/login",
        }

    except HTTPException:
        raise

    except Exception as e:
        print("VERIFY EMAIL ERROR:", repr(e))

        raise HTTPException(
            status_code=400,
            detail=f"Verifikasi OTP gagal: {str(e)}",
        )