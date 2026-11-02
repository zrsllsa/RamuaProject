import os

from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client


# =========================================================
# LOAD .ENV
# =========================================================

BASE_DIR = Path(__file__).resolve().parent

load_dotenv(
    BASE_DIR / ".env"
)


# =========================================================
# SUPABASE CONFIG
# =========================================================

SUPABASE_URL = os.getenv(
    "SUPABASE_URL"
)

SUPABASE_KEY = os.getenv(
    "SUPABASE_KEY"
)

SUPABASE_SERVICE_ROLE_KEY = os.getenv(
    "SUPABASE_SERVICE_ROLE_KEY"
)


# =========================================================
# VALIDASI
# =========================================================

if not SUPABASE_URL:
    raise ValueError(
        "SUPABASE_URL belum ditemukan di .env"
    )

if not SUPABASE_KEY:
    raise ValueError(
        "SUPABASE_KEY belum ditemukan di .env"
    )


# =========================================================
# CLIENT BIASA
# =========================================================

supabase: Client = create_client(
    SUPABASE_URL,
    SUPABASE_KEY
)


# =========================================================
# CLIENT ADMIN
# =========================================================

def get_supabase_admin() -> Client:

    if not SUPABASE_SERVICE_ROLE_KEY:
        raise ValueError(
            "SUPABASE_SERVICE_ROLE_KEY belum ditemukan di .env"
        )

    return create_client(
        SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY
    )