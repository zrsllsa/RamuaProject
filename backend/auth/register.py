
import os
import secrets
import hashlib
import smtplib

from datetime import datetime, timedelta, timezone
from email.message import EmailMessage

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr, model_validator

from supabase_client import get_supabase_admin


router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"],
)


# =========================================================
# REQUEST MODEL
# =========================================================

class RegisterRequest(BaseModel):
    name: str | None = None
    nama: str | None = None
    nama_panggilan: str | None = None
    email: EmailStr
    password: str

    @model_validator(mode="before")
    @classmethod
    def normalize_name(cls, values):
        if isinstance(values, dict):
            if not values.get("name"):
                values["name"] = (
                    values.get("nama")
                    or values.get("nama_panggilan")
                )
        return values


class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp: str


# =========================================================
# SEND OTP EMAIL
# =========================================================

def send_verification_email(email: str, otp: str):

    smtp_email = os.getenv("SMTP_EMAIL")
    smtp_password = os.getenv("SMTP_PASSWORD")

    if not smtp_email:
        raise Exception("SMTP_EMAIL tidak ditemukan di .env")

    if not smtp_password:
        raise Exception("SMTP_PASSWORD tidak ditemukan di .env")

    message = EmailMessage()

    message["From"] = smtp_email
    message["To"] = email
    message["Subject"] = "Kode Verifikasi Akun Ramua"

    message.set_content(
        f"""Halo!

Terima kasih sudah mendaftar di Ramua.

Kode OTP verifikasi akun kamu:

{otp}

Kode ini berlaku selama 30 menit.

Jika kamu tidak merasa melakukan pendaftaran,
abaikan email ini.

Salam,
Ramua
"""
    )

    with smtplib.SMTP_SSL(
        "smtp.gmail.com",
        465,
        timeout=30,
    ) as server:

        server.login(smtp_email, smtp_password)
        server.send_message(message)


# =========================================================
# REGISTER
# =========================================================

@router.post("/register")
def register(data: RegisterRequest):

    print("====================================")
    print("REGISTER BARU")
    print("EMAIL:", data.email)
    print("====================================")

    try:

        admin = get_supabase_admin()

        # 1. NORMALISASI DATA

        name = (data.name or "").strip()
        email = str(data.email).lower().strip()
        password = data.password

        # 2. VALIDASI NAMA

        if not name:
            raise HTTPException(
                status_code=400,
                detail="Nama panggilan tidak boleh kosong.",
            )

        # 3. VALIDASI PASSWORD

        if len(password) < 8:
            raise HTTPException(
                status_code=400,
                detail="Password minimal 8 karakter.",
            )

        # 4. CEK EMAIL TERDAFTAR

        try:

            auth_users = admin.auth.admin.list_users()

            for user in auth_users:

                if (
                    user.email
                    and user.email.lower().strip() == email
                ):
                    raise HTTPException(
                        status_code=400,
                        detail="Email sudah terdaftar.",
                    )

        except HTTPException:
            raise

        except Exception as auth_check_error:

            print(
                "AUTH USER CHECK ERROR:",
                repr(auth_check_error),
            )

        # 5. BUAT OTP 4 DIGIT

        otp = str(
            secrets.randbelow(10000)
        ).zfill(4)

        # 6. HASH OTP

        otp_hash = hashlib.sha256(
            otp.encode("utf-8")
        ).hexdigest()

        # 7. WAKTU EXPIRED 30 MENIT

        expires_at = (
            datetime.now(timezone.utc)
            + timedelta(minutes=30)
        )

        # 8. HAPUS PENDING LAMA

        admin.table(
            "pending_registrations"
        ).delete().eq(
            "email",
            email,
        ).execute()

        # 9. SIMPAN DATA PENDING

        pending_data = {
            "name": name,
            "email": email,
            "password": password,
            "otp_hash": otp_hash,
            "expires_at": expires_at.isoformat(),
        }

        admin.table(
            "pending_registrations"
        ).insert(
            pending_data
        ).execute()

        print("DATA PENDING BERHASIL DISIMPAN")

        # 10. KIRIM OTP

        try:

            send_verification_email(
                email=email,
                otp=otp,
            )

            print("OTP BERHASIL DIKIRIM")

        except Exception as e:

            print("ERROR SMTP:", repr(e))

            admin.table(
                "pending_registrations"
            ).delete().eq(
                "email",
                email,
            ).execute()

            raise HTTPException(
                status_code=400,
                detail=(
                    "Registrasi gagal. "
                    "Email OTP tidak dapat dikirim."
                ),
            )

        # 11. RESPONSE

        return {
            "success": True,
            "message": "OTP berhasil dikirim. Silakan cek email kamu.",
            "email": email,
        }

    except HTTPException:
        raise

    except Exception as e:

        print("ERROR REGISTER:", repr(e))

        raise HTTPException(
            status_code=500,
            detail=f"Register gagal: {str(e)}",
        )


# =========================================================
# VERIFY OTP
# =========================================================

@router.post("/verify-otp")
def verify_otp(data: VerifyOTPRequest):

    print("====================================")
    print("VERIFY OTP")
    print("EMAIL:", data.email)
    print("====================================")

    try:

        admin = get_supabase_admin()

        # 1. NORMALISASI

        email = str(data.email).lower().strip()
        otp = data.otp.strip()

        # 2. VALIDASI OTP

        if not otp.isdigit():
            raise HTTPException(
                status_code=400,
                detail="OTP harus berupa angka.",
            )

        if len(otp) != 4:
            raise HTTPException(
                status_code=400,
                detail="OTP harus terdiri dari 4 digit.",
            )

        # 3. CARI DATA PENDING

        result = (
            admin.table("pending_registrations")
            .select("*")
            .eq("email", email)
            .limit(1)
            .execute()
        )

        if not result.data:
            raise HTTPException(
                status_code=400,
                detail="Data pendaftaran tidak ditemukan. Silakan daftar kembali.",
            )

        pending = result.data[0]

        # 4. CEK EXPIRED

        expires_at = datetime.fromisoformat(
            str(pending["expires_at"]).replace(
                "Z",
                "+00:00",
            )
        )

        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(
                tzinfo=timezone.utc,
            )

        if datetime.now(timezone.utc) > expires_at:

            admin.table(
                "pending_registrations"
            ).delete().eq(
                "email",
                email,
            ).execute()

            raise HTTPException(
                status_code=400,
                detail="Kode OTP sudah kadaluarsa. Silakan daftar kembali.",
            )

        # 5. HASH OTP INPUT

        entered_otp_hash = hashlib.sha256(
            otp.encode("utf-8")
        ).hexdigest()

        # 6. BANDINGKAN OTP

        if not secrets.compare_digest(
            entered_otp_hash,
            str(pending["otp_hash"]),
        ):
            raise HTTPException(
                status_code=400,
                detail="Kode OTP salah.",
            )

        print("OTP BENAR")

        # 7. CEK EMAIL SUDAH TERDAFTAR

        try:

            auth_users = admin.auth.admin.list_users()

            for user in auth_users:

                if (
                    user.email
                    and user.email.lower().strip() == email
                ):

                    admin.table(
                        "pending_registrations"
                    ).delete().eq(
                        "email",
                        email,
                    ).execute()

                    raise HTTPException(
                        status_code=400,
                        detail="Email sudah terdaftar.",
                    )

        except HTTPException:
            raise

        except Exception as auth_check_error:

            print(
                "AUTH USER CHECK ERROR:",
                repr(auth_check_error),
            )

        # 8. BUAT USER SUPABASE AUTH

        user_result = admin.auth.admin.create_user(
            {
                "email": pending["email"],
                "password": pending["password"],
                "email_confirm": True,
                "user_metadata": {
                    "full_name": pending["name"],
                    "nickname": pending["name"],
                },
            }
        )

        if not user_result.user:
            raise HTTPException(
                status_code=400,
                detail="Gagal membuat akun di Supabase Auth.",
            )

        user_id = user_result.user.id

        print("USER BERHASIL DIBUAT:", user_id)

        # 9. SIMPAN PROFILE

        profile_data = {
            "id": user_id,
            "full_name": pending["name"],
            "email": email,
        }

        admin.table(
            "profiles"
        ).insert(
            profile_data
        ).execute()

        # 10. HAPUS DATA PENDING

        admin.table(
            "pending_registrations"
        ).delete().eq(
            "email",
            email,
        ).execute()

        # 11. RESPONSE

        return {
            "success": True,
            "message": "Email berhasil diverifikasi. Akun berhasil dibuat.",
            "email": email,
            "user_id": user_id,
            "redirect": "/login",
        }

    except HTTPException:
        raise

    except Exception as e:

        print("ERROR VERIFY OTP:", repr(e))

        raise HTTPException(
            status_code=500,
            detail=f"Verifikasi OTP gagal: {str(e)}",
        )
